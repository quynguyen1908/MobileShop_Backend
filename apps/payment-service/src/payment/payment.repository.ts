import { Injectable } from '@nestjs/common';
import { IPaymentRepository } from './payment.port';
import { PaymentPrismaService } from '@app/prisma';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '@app/contracts/payment/payment.model';
import { PaymentUpdateDto } from '@app/contracts/payment';

interface PrismaPaymentMethod {
  id: number;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaPayment {
  id: number;
  paymentMethodId: number;
  orderId: number;
  transactionId: string;
  status: string;
  amount: number;
  payDate: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PaymentPrismaService) {}

  // Payment methods
  async findAllPaymentMethods(): Promise<PaymentMethod[]> {
    const prismaService = this.prisma as unknown as {
      paymentMethod: {
        findMany: (param: {
          where: { isDeleted: boolean };
        }) => Promise<PrismaPaymentMethod[]>;
      };
    };
    const methods = await prismaService.paymentMethod.findMany({
      where: { isDeleted: false },
    });
    return methods.map((method) => this._toPaymentMethodModel(method));
  }

  // Payment
  async findPaymentsByOrderId(orderId: number): Promise<Payment[]> {
    const prismaService = this.prisma as unknown as {
      payment: {
        findMany: (param: {
          where: { orderId: number; isDeleted: boolean };
        }) => Promise<PrismaPayment[]>;
      };
    };
    const payments = await prismaService.payment.findMany({
      where: { orderId, isDeleted: false },
    });
    return payments.map((payment) => this._toPaymentModel(payment));
  }

  async findPaymentsByOrderIds(orderIds: number[]): Promise<Payment[]> {
    const prismaService = this.prisma as unknown as {
      payment: {
        findMany: (param: {
          where: { orderId: { in: number[] }; isDeleted: boolean };
        }) => Promise<PrismaPayment[]>;
      };
    };
    const payments = await prismaService.payment.findMany({
      where: { orderId: { in: orderIds }, isDeleted: false },
    });
    return payments.map((payment) => this._toPaymentModel(payment));
  }

  async insertPayment(data: Omit<Payment, 'id'>): Promise<Payment> {
    const prismaService = this.prisma as unknown as {
      payment: {
        create: (param: { data: any }) => Promise<PrismaPayment>;
      };
    };
    const payment = await prismaService.payment.create({ data });
    return this._toPaymentModel(payment);
  }

  async updatePayment(id: number, data: PaymentUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      payment: {
        update: (param: { where: { id: number }; data: any }) => Promise<void>;
      };
    };
    await prismaService.payment.update({ where: { id }, data });
  }

  private _toPaymentMethodModel(data: PrismaPaymentMethod): PaymentMethod {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toPaymentModel(data: PrismaPayment): Payment {
    let typedStatus: PaymentStatus | undefined;
    if (data.status !== null && data.status !== undefined) {
      if (typeof data.status === 'string') {
        const validStatuses = Object.values(PaymentStatus) as string[];
        if (validStatuses.includes(data.status)) {
          typedStatus = data.status as PaymentStatus;
        }
      }
    }

    return {
      id: data.id,
      paymentMethodId: data.paymentMethodId,
      orderId: data.orderId,
      transactionId: data.transactionId,
      status: typedStatus!,
      amount: data.amount,
      payDate: data.payDate ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }
}
