import { Requester } from '@app/contracts';
import {
  Payment,
  PaymentCreateDto,
  PaymentDto,
  PaymentMethod,
  VNPayCallbackDto,
  VNPayResultDto,
} from '@app/contracts/payment';

export interface IPaymentService {
  getPaymentsByOrderIds(orderIds: number[]): Promise<PaymentDto[]>;
}

export interface IVNPayService {
  createPaymentUrl(
    requester: Requester,
    paymentCreateDto: PaymentCreateDto,
  ): Promise<string>;
  processCallback(params: VNPayCallbackDto): Promise<VNPayResultDto>;
}

export interface IPaymentRepository
  extends IPaymentCommandRepository,
    IPaymentQueryRepository {}

export interface IPaymentCommandRepository {
  // Payment
  insertPayment(data: Payment): Promise<Payment>;
}

export interface IPaymentQueryRepository {
  // Payment methods
  findAllPaymentMethods(): Promise<PaymentMethod[]>;

  // Payment
  findPaymentsByOrderId(orderId: number): Promise<Payment[]>;
  findPaymentsByOrderIds(orderIds: number[]): Promise<Payment[]>;
}
