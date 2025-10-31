import { Inject, Injectable } from '@nestjs/common';
import type { IPaymentRepository, IPaymentService } from '../payment.port';
import { PaymentDto } from '@app/contracts/payment';
import { PAYMENT_REPOSITORY } from '@app/contracts';

@Injectable()
export class PaymentService implements IPaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async getPaymentsByOrderIds(orderIds: number[]): Promise<PaymentDto[]> {
    const payments =
      await this.paymentRepository.findPaymentsByOrderIds(orderIds);
    if (payments && payments.length > 0) {
      const payMethods = await this.paymentRepository.findAllPaymentMethods();
      const paymentDtos: PaymentDto[] = payments.map((payment) => {
        const payMethod = payMethods.find(
          (method) => method.id === payment.paymentMethodId,
        );
        return {
          id: payment.id,
          orderId: payment.orderId,
          transactionId: payment.transactionId,
          status: payment.status,
          amount: payment.amount,
          paymentMethod: payMethod!,
          payDate: payment.payDate,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          isDeleted: payment.isDeleted,
        };
      });
      return paymentDtos;
    } else {
      return [];
    }
  }
}
