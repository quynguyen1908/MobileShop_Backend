import { Inject, Injectable } from '@nestjs/common';
import type { IVoucherRepository, IVoucherService } from './voucher.port';
import {
  AppError,
  Paginated,
  PagingDto,
  PAYMENT_SERVICE,
  PHONE_SERVICE,
  VOUCHER_REPOSITORY,
} from '@app/contracts';
import {
  ApplyTo,
  DiscountType,
  Voucher,
  VoucherCategory,
  VoucherCategoryDto,
  VoucherCreateDto,
  voucherCreateDtoSchema,
  VoucherDto,
  VoucherPaymentMethod,
  VoucherPaymentMethodDto,
  VoucherUpdateDto,
  VoucherUpdateRequest,
} from '@app/contracts/voucher';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Category, PHONE_PATTERN, PhoneVariantDto } from '@app/contracts/phone';
import { PAYMENT_PATTERN, PaymentMethod } from '@app/contracts/payment';

@Injectable()
export class VoucherService implements IVoucherService {
  constructor(
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepository: IVoucherRepository,
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    @Inject(PAYMENT_SERVICE) private readonly paymentServiceClient: ClientProxy,
  ) {}

  // Voucher

  async listVouchers(paging: PagingDto): Promise<Paginated<VoucherDto>> {
    const paginatedVouchers = await this.voucherRepository.listVouchers(paging);

    if (!paginatedVouchers.data || paginatedVouchers.data.length === 0) {
      return {
        data: [],
        paging: paginatedVouchers.paging,
        total: paginatedVouchers.total,
      };
    }

    const voucherDtos = await this.toVoucherDto(paginatedVouchers.data);

    return {
      data: voucherDtos,
      paging: paginatedVouchers.paging,
      total: paginatedVouchers.total,
    };
  }

  async getVouchersByIds(voucherIds: number[]): Promise<VoucherDto[]> {
    const vouchers = await this.voucherRepository.findVouchersByIds(voucherIds);
    return this.toVoucherDto(vouchers);
  }

  async getVouchersByVariantIds(variantIds: number[]): Promise<VoucherDto[]> {
    const variants = await firstValueFrom<PhoneVariantDto[]>(
      this.phoneServiceClient.send(
        PHONE_PATTERN.GET_VARIANTS_BY_IDS,
        variantIds,
      ),
    );

    if (variants.length === 0) {
      return [];
    }

    const categoryIds = [
      ...new Set(
        variants
          .map((v) => v.phone?.category?.id)
          .filter((id): id is number => id !== undefined),
      ),
    ];

    let vouchers: Voucher[] = [];

    if (categoryIds.length > 0) {
      const voucherCategories =
        await this.voucherRepository.findVoucherCategoriesByCategoryIds(
          categoryIds,
        );
      const voucherIds = [
        ...new Set(voucherCategories.map((vc) => vc.voucherId)),
      ];
      if (voucherIds.length > 0) {
        vouchers = await this.voucherRepository.findVouchersByIds(voucherIds);
      }
    }

    const applicableVouchers =
      await this.voucherRepository.findVouchersByApplyTo([
        ApplyTo.PAYMENT_METHOD,
        ApplyTo.ALL,
      ]);
    vouchers = vouchers.concat(applicableVouchers);

    const uniqueVouchersMap = new Map<number, Voucher>();
    vouchers.forEach((v) => {
      uniqueVouchersMap.set(v.id!, v);
    });

    const uniqueVouchers = Array.from(uniqueVouchersMap.values());
    return this.toVoucherDto(uniqueVouchers);
  }

  async markVouchersAsUsed(
    voucherIds: number[],
    orderId: number,
    customerId: number,
  ): Promise<void> {
    const vouchers = await this.voucherRepository.findVouchersByIds(voucherIds);

    return Promise.all(
      voucherIds.map(async (voucherId) => {
        const voucher = vouchers.find((v) => v.id === voucherId);
        if (voucher) {
          const voucherUsage =
            await this.voucherRepository.findVoucherUsageByFilter({
              voucherId: voucher.id!,
              customerId,
              orderId,
            });

          if (voucherUsage) {
            // Voucher already marked as used for this order and customer
            return;
          }

          const usage = {
            voucherId: voucher.id!,
            orderId,
            customerId,
            usedAt: new Date(),
          };
          await this.voucherRepository.insertVoucherUsage(usage);

          await this.voucherRepository.updateVoucher(voucher.id!, {
            usedCount: (voucher.usedCount || 0) + 1,
          });
        }
      }),
    ).then(() => undefined);
  }

  async createVoucher(voucherCreateDto: VoucherCreateDto): Promise<number> {
    const data = voucherCreateDtoSchema.parse(voucherCreateDto);

    // Validate discountValue for percentage type
    if (data.discountType === DiscountType.PERCENT) {
      if (data.discountValue < 0 || data.discountValue > 100) {
        throw new RpcException(
          AppError.from(new Error('Discount value must be between 0 and 100 for percentage discount'))
            .withLog('Invalid discount value for percentage type')
            .toJson(false),
        );
      }
    } else if (data.discountType === DiscountType.AMOUNT) {
      if (data.discountValue < 0) {
        throw new RpcException(
          AppError.from(new Error('Discount value must be non-negative'))
            .withLog('Invalid discount value for amount type')
            .toJson(false),
        );
      }
    }

    // Validate maxDiscountValue <= minOrderValue
    if (data.maxDiscountValue > 0 && data.maxDiscountValue > data.minOrderValue) {
      throw new RpcException(
        AppError.from(new Error('Max discount value cannot be greater than minimum order value'))
          .withLog('Invalid max discount value')
          .toJson(false),
      );
    }

    // Validate date ranges
    const now = new Date();
    if (data.startDate < now) {
      throw new RpcException(
        AppError.from(new Error('Start date cannot be in the past'))
          .withLog('Invalid start date')
          .toJson(false),
      );
    }

    if (data.endDate && data.startDate >= data.endDate) {
      throw new RpcException(
        AppError.from(new Error('End date must be after start date'))
          .withLog('Invalid end date')
          .toJson(false),
      );
    }

    // Validate usage limits
    if (data.usageLimitPerUser >= data.usageLimit) {
      throw new RpcException(
        AppError.from(new Error('Usage limit per user must be less than total usage limit'))
          .withLog('Invalid usage limits')
          .toJson(false),
      );
    }

    // Check if voucher code already exists
    const existingVouchers = await this.voucherRepository.findVouchersByCode(data.code);
    if (existingVouchers.length > 0) {
      throw new RpcException(
        AppError.from(new Error('Voucher code already exists'))
          .withLog('Duplicate voucher code')
          .toJson(false),
      );
    }

    // Create voucher
    const voucher: Voucher = {
      code: data.code,
      title: data.title,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue,
      maxDiscountValue: data.maxDiscountValue,
      startDate: data.startDate,
      endDate: data.endDate,
      usageLimit: data.usageLimit,
      usageLimitPerUser: data.usageLimitPerUser,
      usedCount: 0,
      appliesTo: data.appliesTo,
      isDeleted: false,
    };

    const createdVoucher = await this.voucherRepository.insertVoucher(voucher);

    // Handle category assignments if voucher applies to categories
    if (data.appliesTo === ApplyTo.CATEGORY && data.categories && data.categories.length > 0) {
      const voucherCategories: VoucherCategory[] = data.categories.map(categoryId => ({
        voucherId: createdVoucher.id!,
        categoryId,
      }));
      await this.voucherRepository.insertVoucherCategories(voucherCategories);
    }

    // Handle payment method assignments if voucher applies to payment methods
    if (data.appliesTo === ApplyTo.PAYMENT_METHOD && data.paymentMethods) {
      const voucherPaymentMethod: VoucherPaymentMethod = {
        voucherId: createdVoucher.id!,
        paymentMethodId: data.paymentMethods,
      };
      await this.voucherRepository.insertVoucherPaymentMethods([voucherPaymentMethod]);
    }

    return createdVoucher.id!;
  }

  async updateVoucher(id: number, voucherUpdateDto: VoucherUpdateRequest): Promise<void> {
    const voucher = await this.voucherRepository.findVouchersByIds([id]);

    if (voucher.length === 0) {
      throw new RpcException(
        AppError.from(new Error('Voucher not found'))
          .withLog('Voucher not found for update')
          .toJson(false),
      );
    }

    const data: VoucherUpdateDto = {
      ...voucherUpdateDto,
      updatedAt: new Date(),
    }

    await this.voucherRepository.updateVoucher(id, data);
  }

  private async toVoucherDto(vouchers: Voucher[]): Promise<VoucherDto[]> {
    const voucherIds = [
      ...new Set(
        vouchers
          .map((v) => v.id)
          .filter((id): id is number => id !== undefined),
      ),
    ];
    const usages =
      await this.voucherRepository.findVoucherUsagesByVoucherIds(voucherIds);

    const vc =
      await this.voucherRepository.findVoucherCategoriesByVoucherIds(
        voucherIds,
      );
    const categories = await firstValueFrom<Category[]>(
      this.phoneServiceClient.send(
        PHONE_PATTERN.GET_CATEGORIES_BY_IDS,
        vc.map((c) => c.categoryId),
      ),
    );

    const vpm =
      await this.voucherRepository.findVoucherPaymentMethodsByVoucherIds(
        voucherIds,
      );
    const paymentMethods = await firstValueFrom<PaymentMethod[]>(
      this.paymentServiceClient.send(
        PAYMENT_PATTERN.GET_ALL_PAYMENT_METHODS,
        {},
      ),
    );

    const voucherDtos: VoucherDto[] = vouchers.map((voucher) => {
      const voucherUsages = usages.filter((u) => u.voucherId === voucher.id);
      const voucherCategories = vc.filter((c) => c.voucherId === voucher.id);
      const voucherPaymentMethods = vpm.filter(
        (pm) => pm.voucherId === voucher.id,
      );

      switch (voucher.appliesTo) {
        case ApplyTo.CATEGORY: {
          const vcDtos: VoucherCategoryDto[] = voucherCategories.map(
            (vcItem) => {
              const category = categories.find(
                (c) => c.id === vcItem.categoryId,
              );
              return {
                voucherId: vcItem.voucherId,
                category: category!,
              };
            },
          );

          return {
            ...voucher,
            usageHistory: voucherUsages,
            categories: vcDtos,
          };
        }
        case ApplyTo.PAYMENT_METHOD: {
          const vpmDtos: VoucherPaymentMethodDto[] = voucherPaymentMethods.map(
            (vpmItem) => {
              const paymentMethod = paymentMethods.find(
                (pm) => pm.id === vpmItem.paymentMethodId,
              );
              return {
                voucherId: vpmItem.voucherId,
                paymentMethod: paymentMethod!,
              };
            },
          );

          return {
            ...voucher,
            usageHistory: voucherUsages,
            paymentMethods: vpmDtos,
          };
        }
        default: {
          return {
            ...voucher,
            usageHistory: voucherUsages,
          };
        }
      }
    });

    return voucherDtos;
  }
}
