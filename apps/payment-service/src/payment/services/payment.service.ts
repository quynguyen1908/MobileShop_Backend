import { Inject, Injectable } from '@nestjs/common';
import type { IPaymentRepository, IPaymentService } from '../payment.port';
import {
  Payment,
  PaymentDto,
  PaymentMethod,
  PaymentStatus,
  PaymentUpdateDto,
  PayMethod,
} from '@app/contracts/payment';
import {
  AppError,
  ORDER_SERVICE,
  PAYMENT_REPOSITORY,
  Requester,
  USER_SERVICE,
} from '@app/contracts';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CustomerDto,
  ErrCustomerNotFound,
  USER_PATTERN,
} from '@app/contracts/user';
import { ErrOrderNotFound, Order, ORDER_PATTERN } from '@app/contracts/order';

@Injectable()
export class PaymentService implements IPaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
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

  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return this.paymentRepository.findAllPaymentMethods();
  }

  async createPayment(payment: Payment): Promise<number> {
    const newPayment = await this.paymentRepository.insertPayment(payment);
    return newPayment.id!;
  }

  async createCODPayment(
    requester: Requester,
    orderId: number,
  ): Promise<number> {
    const customer = await firstValueFrom<CustomerDto>(
      this.userServiceClient.send(
        USER_PATTERN.GET_CUSTOMER_BY_USER_ID,
        requester,
      ),
    );

    if (!customer) {
      throw new RpcException(
        AppError.from(ErrCustomerNotFound, 404)
          .withLog('Customer not found for user')
          .toJson(false),
      );
    }

    if (typeof customer.id !== 'number') {
      throw new RpcException(
        AppError.from(ErrCustomerNotFound, 404)
          .withLog('Customer ID is missing')
          .toJson(false),
      );
    }

    const order = await firstValueFrom<Order>(
      this.orderServiceClient.send(ORDER_PATTERN.GET_ORDER_BY_ID, orderId),
    );

    if (!order) {
      throw new RpcException(
        AppError.from(ErrOrderNotFound, 404)
          .withLog('Order not found')
          .toJson(false),
      );
    }

    if (typeof order.id !== 'number') {
      throw new RpcException(
        AppError.from(ErrOrderNotFound, 404)
          .withLog('Order ID is missing')
          .toJson(false),
      );
    }

    if (order.customerId !== customer.id) {
      throw new RpcException(
        AppError.from(new Error('Order does not belong to customer'), 403)
          .withLog('Order does not belong to customer')
          .toJson(false),
      );
    }

    const payments =
      await this.paymentRepository.findPaymentsByOrderId(orderId);

    for (const payment of payments) {
      if ((payment.status as PaymentStatus) === PaymentStatus.COMPLETED) {
        throw new RpcException(
          AppError.from(new Error('Payment already completed'), 400)
            .withLog(
              'Attempted to create COD payment for an order that is already paid',
            )
            .toJson(false),
        );
      }
    }

    const paymentMethods = await this.paymentRepository.findAllPaymentMethods();
    const codMethod = paymentMethods.find(
      (method) => method.code === PayMethod.COD.toString(),
    );

    const transactionId = `${order.orderCode}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const codPayment: Payment = {
      orderId: orderId,
      transactionId: transactionId,
      status: PaymentStatus.PENDING,
      amount: order.finalAmount,
      paymentMethodId: codMethod?.id ?? 2,
      isDeleted: false,
    };

    const newPayment = await this.paymentRepository.insertPayment(codPayment);
    return newPayment.id!;
  }

  async updatePayment(id: number, data: PaymentUpdateDto): Promise<void> {
    await this.paymentRepository.updatePayment(id, data);
  }
}
