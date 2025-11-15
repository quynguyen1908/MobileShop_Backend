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

// Create Voucher

export const voucherCreateDtoSchema = voucherSchema
  .omit({
    id: true,
    startDate: true,
    endDate: true,
    usedCount: true,
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .required()
  .extend({
    startDate: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid start date format',
      })
      .transform((date) => new Date(date)),
    endDate: z
      .string()
      .optional()
      .nullable()
      .refine(
        (date) => {
          if (date == null || date === '') return true;
          return !isNaN(Date.parse(date));
        },
        {
          message: 'Invalid end date format',
        },
      )
      .transform((date) => {
        if (date == null || date === '') return null;
        return new Date(date);
      }),
    categories: z.array(z.number()).optional(),
    paymentMethods: z.number().optional(),
  });

export type VoucherCreateDto = z.infer<typeof voucherCreateDtoSchema>;

// Update Voucher

export const voucherUpdateRequestSchema = voucherSchema
  .pick({
    title: true,
    description: true,
    endDate: true,
  })
  .partial();

export type VoucherUpdateRequest = z.infer<typeof voucherUpdateRequestSchema>;

export const voucherUpdateDtoSchema = voucherSchema
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();

export type VoucherUpdateDto = z.infer<typeof voucherUpdateDtoSchema>;
