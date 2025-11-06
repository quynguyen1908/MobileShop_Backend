import { z } from 'zod';
import {
  voucherCategorySchema,
  voucherPaymentMethodSchema,
  voucherSchema,
  voucherUsageSchema,
} from './voucher.model';
import { categorySchema } from '../phone/phone.model';
import { paymentMethodSchema } from '../payment/payment.model';

// Voucher Category

export const voucherCategoryDtoSchema = voucherCategorySchema
  .omit({
    categoryId: true,
  })
  .extend({
    category: categorySchema,
  });

export type VoucherCategoryDto = z.infer<typeof voucherCategoryDtoSchema>;

// Voucher Payment Method

export const voucherPaymentMethodDtoSchema = voucherPaymentMethodSchema
  .omit({
    paymentMethodId: true,
  })
  .extend({
    paymentMethod: paymentMethodSchema,
  });

export type VoucherPaymentMethodDto = z.infer<
  typeof voucherPaymentMethodDtoSchema
>;

// Voucher

export const voucherDtoSchema = voucherSchema.extend({
  categories: z.array(voucherCategoryDtoSchema).optional(),
  paymentMethods: z.array(voucherPaymentMethodDtoSchema).optional(),
  usageHistory: voucherUsageSchema.array(),
});

export type VoucherDto = z.infer<typeof voucherDtoSchema>;

// Voucher Usage Filter

export const voucherUsageFilterSchema = voucherUsageSchema
  .pick({
    voucherId: true,
    customerId: true,
    orderId: true,
  })
  .partial();

export type VoucherUsageFilter = z.infer<typeof voucherUsageFilterSchema>;

// Update Voucher

export const voucherUpdateDtoSchema = voucherSchema
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();

export type VoucherUpdateDto = z.infer<typeof voucherUpdateDtoSchema>;
