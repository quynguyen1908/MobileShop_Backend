import { z } from 'zod';

export enum PayMethod {
  VNPAY = 'VNPAY',
  COD = 'COD',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Payment method

export const ErrPaymentMethodCodeMax50 = new Error(
  'Payment method code must be at most 50 characters long',
);
export const ErrPaymentMethodNameMax100 = new Error(
  'Payment method name must be at most 100 characters long',
);

export const paymentMethodSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().max(50, ErrPaymentMethodCodeMax50.message),
  name: z.string().max(100, ErrPaymentMethodNameMax100.message),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Payment

export const ErrTransactionIdMax100 = new Error(
  'Transaction ID must be at most 100 characters long',
);

export const paymentSchema = z.object({
  id: z.number().int().positive().optional(),
  paymentMethodId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  transactionId: z.string().max(100, ErrTransactionIdMax100.message),
  status: z.enum(PaymentStatus).default(PaymentStatus.PENDING),
  amount: z.number().int().nonnegative(),
  payDate: z.string().max(50).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Payment = z.infer<typeof paymentSchema>;
