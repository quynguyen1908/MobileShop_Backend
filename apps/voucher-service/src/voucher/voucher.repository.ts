import { Injectable } from '@nestjs/common';
import { IVoucherRepository } from './voucher.port';
import {
  ApplyTo,
  DiscountType,
  Voucher,
  VoucherCategory,
  VoucherPaymentMethod,
  VoucherUpdateDto,
  VoucherUsage,
  VoucherUsageFilter,
} from '@app/contracts/voucher';
import { PagingDto, Paginated } from '@app/contracts';
import { VoucherPrismaService } from '@app/prisma';

interface PrismaVoucher {
  id: number;
  code: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscountValue: number;
  startDate: Date;
  endDate: Date | null;
  usageLimit: number;
  usageLimitPerUser: number;
  usedCount: number;
  appliesTo: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVoucherCategory {
  voucherId: number;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVoucherPaymentMethod {
  voucherId: number;
  paymentMethodId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVoucherUsage {
  id: number;
  voucherId: number;
  customerId: number;
  orderId: number;
  usedAt: Date;
}

@Injectable()
export class VoucherRepository implements IVoucherRepository {
  constructor(private readonly prisma: VoucherPrismaService) {}

  // Voucher

  async listVouchers(paging: PagingDto): Promise<Paginated<Voucher>> {
    const skip = (paging.page - 1) * paging.limit;
    const prismaService = this.prisma as unknown as {
      voucher: {
        count: (param: { where: any }) => Promise<number>;
        findMany: (param: {
          where: any;
          skip: number;
          take: number;
          orderBy: any;
        }) => Promise<PrismaVoucher[]>;
      };
    };

    const total = await prismaService.voucher.count({
      where: { isDeleted: false },
    });

    const vouchers = await prismaService.voucher.findMany({
      where: { isDeleted: false },
      skip,
      take: paging.limit,
      orderBy: { id: 'asc' },
    });

    return {
      data: vouchers.map((v) => this._toVoucherModel(v)),
      paging,
      total,
    };
  }

  async findVouchersByIds(voucherIds: number[]): Promise<Voucher[]> {
    const prismaService = this.prisma as unknown as {
      voucher: {
        findMany: (param: { where: any }) => Promise<PrismaVoucher[]>;
      };
    };
    const vouchers = await prismaService.voucher.findMany({
      where: {
        id: { in: voucherIds },
        isDeleted: false,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
    });

    const available = vouchers.filter((v) => v.usageLimit > v.usedCount);
    return available.map((v) => this._toVoucherModel(v));
  }

  async findVouchersByApplyTo(applyTo: string[]): Promise<Voucher[]> {
    const prismaService = this.prisma as unknown as {
      voucher: {
        findMany: (param: { where: any }) => Promise<PrismaVoucher[]>;
      };
    };
    const vouchers = await prismaService.voucher.findMany({
      where: {
        appliesTo: { in: applyTo },
        isDeleted: false,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
    });

    const available = vouchers.filter((v) => v.usageLimit > v.usedCount);
    return available.map((v) => this._toVoucherModel(v));
  }

  async insertVoucher(voucher: Voucher): Promise<Voucher> {
    const prismaService = this.prisma as unknown as {
      voucher: {
        create: (param: { data: any }) => Promise<PrismaVoucher>;
      };
    };

    const createdVoucher = await prismaService.voucher.create({
      data: voucher,
    });
    return this._toVoucherModel(createdVoucher);
  }

  async updateVoucher(id: number, data: VoucherUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      voucher: {
        update: (param: { where: any; data: any }) => Promise<PrismaVoucher>;
      };
    };

    await prismaService.voucher.update({
      where: { id },
      data,
    });
  }

  // Voucher Usage

  async findVoucherUsagesByVoucherIds(
    voucherIds: number[],
  ): Promise<VoucherUsage[]> {
    const prismaService = this.prisma as unknown as {
      voucherUsage: {
        findMany: (param: { where: any }) => Promise<PrismaVoucherUsage[]>;
      };
    };
    const usages = await prismaService.voucherUsage.findMany({
      where: {
        voucherId: { in: voucherIds },
      },
    });
    return usages.map((u) => this._toVoucherUsageModel(u));
  }

  async findVoucherUsageByFilter(
    filter: VoucherUsageFilter,
  ): Promise<VoucherUsage | null> {
    const prismaService = this.prisma as unknown as {
      voucherUsage: {
        findFirst: (param: {
          where: any;
        }) => Promise<PrismaVoucherUsage | null>;
      };
    };

    const usage = await prismaService.voucherUsage.findFirst({
      where: {
        voucherId: filter.voucherId,
        customerId: filter.customerId,
        orderId: filter.orderId,
      },
    });

    return usage ? this._toVoucherUsageModel(usage) : null;
  }

  async insertVoucherUsage(voucherUsage: VoucherUsage): Promise<VoucherUsage> {
    const prismaService = this.prisma as unknown as {
      voucherUsage: {
        create: (param: { data: any }) => Promise<PrismaVoucherUsage>;
      };
    };

    const createdUsage = await prismaService.voucherUsage.create({
      data: voucherUsage,
    });
    return this._toVoucherUsageModel(createdUsage);
  }

  // Voucher Category

  async findVoucherCategoriesByVoucherIds(
    voucherIds: number[],
  ): Promise<VoucherCategory[]> {
    const prismaService = this.prisma as unknown as {
      voucherCategory: {
        findMany: (param: { where: any }) => Promise<PrismaVoucherCategory[]>;
      };
    };
    const categories = await prismaService.voucherCategory.findMany({
      where: {
        voucherId: { in: voucherIds },
        isDeleted: false,
      },
    });
    return categories.map((c) => this._toVoucherCategoryModel(c));
  }

  async findVoucherCategoriesByCategoryIds(
    categoryIds: number[],
  ): Promise<VoucherCategory[]> {
    const prismaService = this.prisma as unknown as {
      voucherCategory: {
        findMany: (param: { where: any }) => Promise<PrismaVoucherCategory[]>;
      };
    };
    const categories = await prismaService.voucherCategory.findMany({
      where: {
        categoryId: { in: categoryIds },
        isDeleted: false,
      },
    });
    return categories.map((c) => this._toVoucherCategoryModel(c));
  }

  async findVouchersByCode(code: string): Promise<Voucher[]> {
    const prismaService = this.prisma as unknown as {
      voucher: {
        findMany: (param: { where: any }) => Promise<PrismaVoucher[]>;
      };
    };
    const vouchers = await prismaService.voucher.findMany({
      where: {
        code: code,
        isDeleted: false,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
    });
    return vouchers.map((v) => this._toVoucherModel(v));
  }

  async insertVoucherCategories(
    voucherCategories: VoucherCategory[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      voucherCategory: {
        createMany: (param: { data: any[] }) => Promise<void>;
      };
    };
    await prismaService.voucherCategory.createMany({
      data: voucherCategories,
    });
  }

  // Voucher Payment Method

  async findVoucherPaymentMethodsByVoucherIds(
    voucherIds: number[],
  ): Promise<VoucherPaymentMethod[]> {
    const prismaService = this.prisma as unknown as {
      voucherPaymentMethod: {
        findMany: (param: {
          where: any;
        }) => Promise<PrismaVoucherPaymentMethod[]>;
      };
    };
    const paymentMethods = await prismaService.voucherPaymentMethod.findMany({
      where: {
        voucherId: { in: voucherIds },
        isDeleted: false,
      },
    });
    return paymentMethods.map((pm) => this._toVoucherPaymentMethodModel(pm));
  }

  async insertVoucherPaymentMethods(
    voucherPaymentMethods: VoucherPaymentMethod[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      voucherPaymentMethod: {
        createMany: (param: { data: any[] }) => Promise<void>;
      };
    };
    await prismaService.voucherPaymentMethod.createMany({
      data: voucherPaymentMethods,
    });
  }

  private _toVoucherModel(data: PrismaVoucher): Voucher {
    let discountType: DiscountType | undefined;
    if (data.discountType !== null && data.discountType !== undefined) {
      if (typeof data.discountType === 'string') {
        const validTypes = Object.values(DiscountType) as string[];
        if (validTypes.includes(data.discountType)) {
          discountType = data.discountType as DiscountType;
        }
      }
    }

    let appliesTo: ApplyTo | undefined;
    if (data.appliesTo !== null && data.appliesTo !== undefined) {
      if (typeof data.appliesTo === 'string') {
        const validAppliesTo = Object.values(ApplyTo) as string[];
        if (validAppliesTo.includes(data.appliesTo)) {
          appliesTo = data.appliesTo as ApplyTo;
        }
      }
    }

    return {
      id: data.id,
      code: data.code,
      title: data.title,
      description: data.description,
      discountType: discountType!,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue,
      maxDiscountValue: data.maxDiscountValue,
      startDate: data.startDate,
      endDate: data.endDate,
      usageLimit: data.usageLimit,
      usageLimitPerUser: data.usageLimitPerUser,
      usedCount: data.usedCount,
      appliesTo: appliesTo!,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toVoucherUsageModel(data: PrismaVoucherUsage): VoucherUsage {
    return {
      id: data.id,
      voucherId: data.voucherId,
      customerId: data.customerId,
      orderId: data.orderId,
      usedAt: data.usedAt,
    };
  }

  private _toVoucherCategoryModel(
    data: PrismaVoucherCategory,
  ): VoucherCategory {
    return {
      voucherId: data.voucherId,
      categoryId: data.categoryId,
    };
  }

  private _toVoucherPaymentMethodModel(
    data: PrismaVoucherPaymentMethod,
  ): VoucherPaymentMethod {
    return {
      voucherId: data.voucherId,
      paymentMethodId: data.paymentMethodId,
    };
  }
}
