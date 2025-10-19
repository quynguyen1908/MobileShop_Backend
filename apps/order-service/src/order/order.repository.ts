import { OrderPrismaService } from '@app/contracts/prisma';
import { Injectable } from '@nestjs/common';
import { IOrderRepository } from './order.port';
import {
  Cart,
  CartItem,
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

interface PrismaCart {
  id: number;
  customerId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaCartItem {
  id: number;
  cartId: number;
  variantId: number;
  colorId: number;
  quantity: number;
  price: number;
  discount: number;
}

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: OrderPrismaService) {}

  // Order

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

  async findOrderById(orderId: number): Promise<Order | null> {
    const prismaService = this.prisma as unknown as {
      order: {
        findUnique: (param: {
          where: { id: number };
        }) => Promise<PrismaOrder | null>;
      };
    };
    const order = await prismaService.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return null;
    }
    return this._toOrderModel(order);
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

  async insertOrder(data: Omit<Order, 'id'>): Promise<Order> {
    const prismaService = this.prisma as unknown as {
      order: {
        create: (param: { data: any }) => Promise<PrismaOrder>;
      };
    };

    const order = await prismaService.order.create({ data });
    return this._toOrderModel(order);
  }

  async updateOrder(id: number, status: string): Promise<void> {
    const prismaService = this.prisma as unknown as {
      order: {
        update: (param: {
          where: { id: number };
          data: any;
        }) => Promise<PrismaOrder>;
      };
    };
    await prismaService.order.update({ where: { id }, data: { status } });
  }

  // Order Item

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

  async insertOrderItems(data: OrderItem[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      orderItem: {
        createMany: (param: { data: any[] }) => Promise<PrismaOrderItem[]>;
      };
    };

    await prismaService.orderItem.createMany({ data });
  }

  // Order Status History

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

  async insertOrderStatusHistory(
    data: Omit<OrderStatusHistory, 'id'>,
  ): Promise<OrderStatusHistory> {
    const prismaService = this.prisma as unknown as {
      orderStatusHistory: {
        create: (param: { data: any }) => Promise<PrismaOrderStatusHistory>;
      };
    };

    const history = await prismaService.orderStatusHistory.create({ data });
    return this._toOrderStatusHistoryModel(history);
  }

  // Point Transaction

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

  async insertPointTransactions(
    data: Omit<PointTransaction, 'id'>[],
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

  // Point Config

  async getPointConfig(): Promise<PointConfig | null> {
    const prismaService = this.prisma as unknown as {
      pointConfig: {
        findFirst: (param: {
          where: any;
          orderBy: any;
        }) => Promise<PrismaPointConfig | null>;
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

  // Shipment

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

  // Cart

  async findCartByCustomerId(customerId: number): Promise<Cart | null> {
    const prismaService = this.prisma as unknown as {
      cart: {
        findUnique: (param: {
          where: { customerId: number };
        }) => Promise<PrismaCart | null>;
      };
    };
    const cart = await prismaService.cart.findUnique({ where: { customerId } });
    if (!cart) {
      return null;
    }
    return this._toCartModel(cart);
  }

  async insertCart(data: Omit<Cart, 'id'>): Promise<Cart> {
    const prismaService = this.prisma as unknown as {
      cart: {
        create: (param: { data: any }) => Promise<PrismaCart>;
      };
    };
    const cart = await prismaService.cart.create({ data });
    return this._toCartModel(cart);
  }

  // Cart Item

  async findCartItemsByCartId(cartId: number): Promise<CartItem[]> {
    const prismaService = this.prisma as unknown as {
      cartItem: {
        findMany: (param: {
          where: { cartId: number };
        }) => Promise<PrismaCartItem[]>;
      };
    };
    const items = await prismaService.cartItem.findMany({ where: { cartId } });
    return items.map((item) => this._toCartItemModel(item));
  }

  async findCartItemByCartIdAndVariantIdAndColorId(
    cartId: number,
    variantId: number,
    colorId: number,
  ): Promise<CartItem | null> {
    const prismaService = this.prisma as unknown as {
      cartItem: {
        findFirst: (param: {
          where: { cartId: number; variantId: number; colorId: number };
        }) => Promise<PrismaCartItem | null>;
      };
    };
    const item = await prismaService.cartItem.findFirst({
      where: { cartId, variantId, colorId },
    });
    if (!item) {
      return null;
    }
    return this._toCartItemModel(item);
  }

  async insertCartItem(data: Omit<CartItem, 'id'>): Promise<CartItem> {
    const prismaService = this.prisma as unknown as {
      cartItem: {
        create: (param: { data: any }) => Promise<PrismaCartItem>;
      };
    };
    const item = await prismaService.cartItem.create({ data });
    return this._toCartItemModel(item);
  }

  async updateCartItem(id: number, quantity: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      cartItem: {
        update: (param: {
          where: { id: number };
          data: any;
        }) => Promise<PrismaCartItem>;
      };
    };
    await prismaService.cartItem.update({ where: { id }, data: { quantity } });
  }

  async deleteCartItems(ids: number[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      cartItem: {
        deleteMany: (param: {
          where: { id: { in: number[] } };
        }) => Promise<void>;
      };
    };
    await prismaService.cartItem.deleteMany({ where: { id: { in: ids } } });
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

  private _toCartModel(data: PrismaCart): Cart {
    return {
      id: data.id,
      customerId: data.customerId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toCartItemModel(data: PrismaCartItem): CartItem {
    return {
      id: data.id,
      cartId: data.cartId,
      variantId: data.variantId,
      colorId: data.colorId,
      quantity: data.quantity,
      price: data.price,
      discount: data.discount,
    };
  }
}
