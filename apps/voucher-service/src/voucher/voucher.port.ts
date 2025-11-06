import { Paginated, PagingDto } from '@app/contracts';
import {
  Voucher,
  VoucherCategory,
  VoucherDto,
  VoucherPaymentMethod,
  VoucherUpdateDto,
  VoucherUsage,
  VoucherUsageFilter,
} from '@app/contracts/voucher';

export interface IVoucherService {
  // Voucher
  listVouchers(paging: PagingDto): Promise<Paginated<VoucherDto>>;
  getVouchersByIds(voucherIds: number[]): Promise<VoucherDto[]>;
  getVouchersByVariantIds(variantIds: number[]): Promise<VoucherDto[]>;
  markVouchersAsUsed(
    voucherIds: number[],
    orderId: number,
    customerId: number,
  ): Promise<void>;
}

export interface IVoucherRepository
  extends IVoucherCommandRepository,
    IVoucherQueryRepository {}

export interface IVoucherCommandRepository {
  // Voucher
  insertVoucher(voucher: Voucher): Promise<Voucher>;
  updateVoucher(id: number, data: VoucherUpdateDto): Promise<void>;

  // Voucher Usage
  insertVoucherUsage(voucherUsage: VoucherUsage): Promise<VoucherUsage>;
}

export interface IVoucherQueryRepository {
  // Voucher
  listVouchers(paging: PagingDto): Promise<Paginated<Voucher>>;
  findVouchersByApplyTo(applyTo: string[]): Promise<Voucher[]>;
  findVouchersByIds(voucherIds: number[]): Promise<Voucher[]>;

  // Voucher Usage
  findVoucherUsagesByVoucherIds(voucherIds: number[]): Promise<VoucherUsage[]>;
  findVoucherUsageByFilter(
    filter: VoucherUsageFilter,
  ): Promise<VoucherUsage | null>;

  // Voucher Category
  findVoucherCategoriesByVoucherIds(
    voucherIds: number[],
  ): Promise<VoucherCategory[]>;
  findVoucherCategoriesByCategoryIds(
    categoryIds: number[],
  ): Promise<VoucherCategory[]>;

  // Voucher Payment Method
  findVoucherPaymentMethodsByVoucherIds(
    voucherIds: number[],
  ): Promise<VoucherPaymentMethod[]>;
}
