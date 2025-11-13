import { z } from 'zod';
import { paymentMethodSchema, paymentSchema } from './payment.model';

// Payment Method

export const paymentMethodDtoSchema = paymentMethodSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export type PaymentMethodDto = z.infer<typeof paymentMethodDtoSchema>;

// Payment

export const paymentDtoSchema = paymentSchema
  .omit({
    paymentMethodId: true,
  })
  .extend({
    paymentMethod: paymentMethodSchema,
  });

export type PaymentDto = z.infer<typeof paymentDtoSchema>;

// Create Payment

export const paymentCreateDtoSchema = paymentSchema
  .pick({
    orderId: true,
    paymentMethodId: true,
  })
  .extend({
    ipAddress: z.ipv4().optional(),
  });

export type PaymentCreateDto = z.infer<typeof paymentCreateDtoSchema>;

// Update Payment

export const paymentUpdateDtoSchema = paymentSchema
  .pick({
    status: true,
    payDate: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type PaymentUpdateDto = z.infer<typeof paymentUpdateDtoSchema>;

// Payment Callback

export interface VNPayCallbackDto {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_PayDate?: string;
  vnp_OrderInfo: string;
  vnp_TransactionNo: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash?: string;
  [key: string]: string | undefined;
}

// Payment Result

export interface VNPayResultDto {
  isValid: boolean;
  isSuccess: boolean;
  message: string;
  orderId: number;
  orderCode: string;
  transactionId: string;
  amount: number;
  paymentId?: number;
  payDate?: string;
}
