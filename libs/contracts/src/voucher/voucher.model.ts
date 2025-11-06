import { z } from 'zod';

export enum DiscountType {
  PERCENT = 'percent',
  AMOUNT = 'amount',
}

export enum ApplyTo {
  ALL = 'all',
  CATEGORY = 'category',
  PAYMENT_METHOD = 'payment_method',
}

// Voucher

export const ErrVoucherNotFound = new Error('Voucher not found');
export const ErrVoucherCodeMax50Chars = new Error(
  'Voucher code must be at most 50 characters long',
);

export const voucherSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().max(50, ErrVoucherCodeMax50Chars.message),
  title: z.string(),
  description: z.string(),
  discountType: z.enum(DiscountType),
  discountValue: z.number().nonnegative(),
  minOrderValue: z.number().nonnegative().default(0),
  maxDiscountValue: z.number().nonnegative().default(0),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  usageLimit: z.number().int().nonnegative().default(1),
  usageLimitPerUser: z.number().int().nonnegative().default(1),
  usedCount: z.number().int().nonnegative().default(0),
  appliesTo: z.enum(ApplyTo).default(ApplyTo.ALL),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Voucher = z.infer<typeof voucherSchema>;

// Voucher Usage

export const voucherUsageSchema = z.object({
  id: z.number().int().positive().optional(),
  voucherId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  usedAt: z.date(),
});

export type VoucherUsage = z.infer<typeof voucherUsageSchema>;

// Voucher Category

export const voucherCategorySchema = z.object({
  voucherId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
});

export type VoucherCategory = z.infer<typeof voucherCategorySchema>;

// Voucher Payment Method

export const voucherPaymentMethodSchema = z.object({
  voucherId: z.number().int().positive(),
  paymentMethodId: z.number().int().positive(),
});

export type VoucherPaymentMethod = z.infer<typeof voucherPaymentMethodSchema>;
