import { Requester } from '@app/contracts';
import {
  Payment,
  PaymentCreateDto,
  PaymentDto,
  PaymentMethod,
  PaymentUpdateDto,
  VNPayCallbackDto,
  VNPayResultDto,
} from '@app/contracts/payment';

export interface IPaymentService {
  // Payment
  getPaymentsByOrderIds(orderIds: number[]): Promise<PaymentDto[]>;
  createPayment(payment: Payment): Promise<number>;
  createCODPayment(requester: Requester, orderId: number): Promise<number>;
  updatePayment(id: number, data: PaymentUpdateDto): Promise<void>;

  // Payment methods
  getAllPaymentMethods(): Promise<PaymentMethod[]>;
}

export interface IVNPayService {
  createPaymentUrl(
    requester: Requester,
    paymentCreateDto: PaymentCreateDto,
  ): Promise<string>;
  createMobilePaymentUrl(
    requester: Requester,
    orderId: number,
  ): Promise<string>;
  processCallback(params: VNPayCallbackDto): Promise<VNPayResultDto>;
}

export interface IPaymentRepository
  extends IPaymentCommandRepository,
    IPaymentQueryRepository {}

export interface IPaymentCommandRepository {
  // Payment
  insertPayment(data: Payment): Promise<Payment>;
  updatePayment(id: number, data: PaymentUpdateDto): Promise<void>;
}

export interface IPaymentQueryRepository {
  // Payment methods
  findAllPaymentMethods(): Promise<PaymentMethod[]>;

  // Payment
  findPaymentsByOrderId(orderId: number): Promise<Payment[]>;
  findPaymentsByOrderIds(orderIds: number[]): Promise<Payment[]>;
}
