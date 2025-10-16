import { OrderPrismaService } from '@app/contracts/prisma';
import { Injectable } from '@nestjs/common';
import { IOrderRepository } from './order.port';
import {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  PointConfig,
  PointTransaction,
  PointType,
  Shipment,
  ShipmentStatus,
} from '@app/contracts/order/order.model';

interface PrismaOrder {
  id: number;
  customerId: number;
  orderCode: string;
  orderDate: Date;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  recipientName: string;
  recipientPhone: string;
  status: string;
  street: string;
  communeId: number;
  provinceId: number;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaOrderItem {
  id: number;
  orderId: number;
  variantId: number;
  colorId: number;
  quantity: number;
  price: number;
  discount: number;
}

interface PrismaOrderStatusHistory {
  id: number;
  orderId: number;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaPointTransaction {
  id: number;
  customerId: number;
  orderId: number;
  type: string;
  points: number;
  moneyValue: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaPointConfig {
  id: number;
  earnRate: number;
  redeemRate: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaShipment {
  id: number;
  orderId: number;
  provider: string;
  trackingCode: string | null;
  status: string;
  fee: number;
  estimatedDeliveryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: OrderPrismaService) {}

  async findOrdersByCustomerId(customerId: number): Promise<Order[]> {
    const prismaService = this.prisma as unknown as {
      order: {
        findMany: (param: {
          where: { customerId: number };
        }) => Promise<PrismaOrder[]>;
      };
    };
    const orders = await prismaService.order.findMany({
      where: { customerId },
    });
    return orders.map((order) => this._toOrderModel(order));
  }

  async findOrderItemsByOrderIds(orderIds: number[]): Promise<OrderItem[]> {
    const prismaService = this.prisma as unknown as {
      orderItem: {
        findMany: (param: {
          where: { orderId: { in: number[] } };
        }) => Promise<PrismaOrderItem[]>;
      };
    };
    const items = await prismaService.orderItem.findMany({
      where: { orderId: { in: orderIds } },
    });
    return items.map((item) => this._toOrderItemModel(item));
  }

  async findOrderStatusHistoryByOrderIds(
    orderIds: number[],
  ): Promise<OrderStatusHistory[]> {
    const prismaService = this.prisma as unknown as {
      orderStatusHistory: {
        findMany: (param: {
          where: { orderId: { in: number[] } };
        }) => Promise<PrismaOrderStatusHistory[]>;
      };
    };
    const histories = await prismaService.orderStatusHistory.findMany({
      where: { orderId: { in: orderIds } },
    });
    return histories.map((history) => this._toOrderStatusHistoryModel(history));
  }

  async findPointTransactionsByOrderIds(
    orderIds: number[],
  ): Promise<PointTransaction[]> {
    const prismaService = this.prisma as unknown as {
      pointTransaction: {
        findMany: (param: {
          where: { orderId: { in: number[] } };
        }) => Promise<PrismaPointTransaction[]>;
      };
    };
    const transactions = await prismaService.pointTransaction.findMany({
      where: { orderId: { in: orderIds } },
    });
    return transactions.map((transaction) =>
      this._toPointTransactionModel(transaction),
    );
  }

  async getPointConfig(): Promise<PointConfig | null> {
    const prismaService = this.prisma as unknown as {
      pointConfig: {
        findFirst: (param: { where: any, orderBy: any }) => Promise<PrismaPointConfig | null>;
      };
    };
    const config = await prismaService.pointConfig.findFirst({
      where: {
        isDeleted: false,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!config) {
      return null;
    }
    return this._toPointConfigModel(config);
  }

  async findShipmentsByOrderIds(orderIds: number[]): Promise<Shipment[]> {
    const prismaService = this.prisma as unknown as {
      shipment: {
        findMany: (param: {
          where: { orderId: { in: number[] } };
        }) => Promise<PrismaShipment[]>;
      };
    };
    const shipments = await prismaService.shipment.findMany({
      where: { orderId: { in: orderIds } },
    });
    return shipments.map((shipment) => this._toShipmentModel(shipment));
  }

  async findOrderByOrderCode(orderCode: string): Promise<Order | null> {
    const prismaService = this.prisma as unknown as {
      order: {
        findUnique: (param: {
          where: { orderCode: string };
        }) => Promise<PrismaOrder | null>;
      };
    };
    const order = await prismaService.order.findUnique({
      where: { orderCode },
    });
    if (!order) {
      return null;
    }
    return this._toOrderModel(order);
  }

  async insertOrder(data: Order): Promise<Order> {
    const prismaService = this.prisma as unknown as {
      order: {
        create: (param: { data: any }) => Promise<PrismaOrder>;
      };
    };

    const order = await prismaService.order.create({ data });
    return this._toOrderModel(order);
  }

  async insertOrderItems(data: OrderItem[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      orderItem: {
        createMany: (param: { data: any[] }) => Promise<PrismaOrderItem[]>;
      };
    };

    await prismaService.orderItem.createMany({ data });
  }

  async insertOrderStatusHistory(
    data: OrderStatusHistory,
  ): Promise<OrderStatusHistory> {
    const prismaService = this.prisma as unknown as {
      orderStatusHistory: {
        create: (param: { data: any }) => Promise<PrismaOrderStatusHistory>;
      };
    };

    const history = await prismaService.orderStatusHistory.create({ data });
    return this._toOrderStatusHistoryModel(history);
  }

  async insertPointTransactions(
    data: PointTransaction[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      pointTransaction: {
        createMany: (param: {
          data: any[];
        }) => Promise<PrismaPointTransaction[]>;
      };
    };

    await prismaService.pointTransaction.createMany({
      data,
    });
  }

  private _toOrderModel(data: PrismaOrder): Order {
    let typedStatus: OrderStatus | undefined;
    if (data.status !== null && data.status !== undefined) {
      if (typeof data.status === 'string') {
        const validStatuses = Object.values(OrderStatus) as string[];
        if (validStatuses.includes(data.status)) {
          typedStatus = data.status as OrderStatus;
        }
      }
    }

    return {
      id: data.id,
      customerId: data.customerId,
      orderCode: data.orderCode,
      orderDate: data.orderDate,
      totalAmount: data.totalAmount,
      discountAmount: data.discountAmount,
      shippingFee: data.shippingFee,
      finalAmount: data.finalAmount,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      status: typedStatus!,
      street: data.street,
      communeId: data.communeId,
      provinceId: data.provinceId,
      postalCode: data.postalCode,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toOrderItemModel(data: PrismaOrderItem): OrderItem {
    return {
      id: data.id,
      orderId: data.orderId,
      variantId: data.variantId,
      colorId: data.colorId,
      quantity: data.quantity,
      price: data.price,
      discount: data.discount,
    };
  }

  private _toOrderStatusHistoryModel(
    data: PrismaOrderStatusHistory,
  ): OrderStatusHistory {
    let typedStatus: OrderStatus | undefined;
    if (data.status !== null && data.status !== undefined) {
      if (typeof data.status === 'string') {
        const validStatuses = Object.values(OrderStatus) as string[];
        if (validStatuses.includes(data.status)) {
          typedStatus = data.status as OrderStatus;
        }
      }
    }

    return {
      id: data.id,
      orderId: data.orderId,
      status: typedStatus!,
      note: data.note ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toPointTransactionModel(
    data: PrismaPointTransaction,
  ): PointTransaction {
    let typedType: PointType | undefined;
    if (data.type !== null && data.type !== undefined) {
      if (typeof data.type === 'string') {
        const validTypes = Object.values(PointType) as string[];
        if (validTypes.includes(data.type)) {
          typedType = data.type as PointType;
        }
      }
    }

    return {
      id: data.id,
      customerId: data.customerId,
      orderId: data.orderId,
      type: typedType!,
      points: data.points,
      moneyValue: data.moneyValue,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toPointConfigModel(data: PrismaPointConfig): PointConfig {
    return {
      id: data.id,
      earnRate: data.earnRate,
      redeemRate: data.redeemRate,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toShipmentModel(data: PrismaShipment): Shipment {
    let typedStatus: ShipmentStatus | undefined;
    if (data.status !== null && data.status !== undefined) {
      if (typeof data.status === 'string') {
        const validStatuses = Object.values(ShipmentStatus) as string[];
        if (validStatuses.includes(data.status)) {
          typedStatus = data.status as ShipmentStatus;
        }
      }
    }

    return {
      id: data.id,
      orderId: data.orderId,
      provider: data.provider,
      trackingCode: data.trackingCode ?? undefined,
      status: typedStatus!,
      fee: data.fee,
      estimatedDeliveryDate: data.estimatedDeliveryDate ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }
}
