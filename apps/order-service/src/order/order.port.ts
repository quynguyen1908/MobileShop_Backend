import { Requester } from '@app/contracts';
import {
  Order,
  OrderCreateDto,
  OrderDto,
  OrderItem,
  OrderStatusHistory,
  PointConfig,
  PointTransaction,
  Shipment,
} from '@app/contracts/order';

export interface IOrderService {
  // Order
  getOrdersByCustomerId(requester: Requester): Promise<OrderDto[]>;
  getOrderByOrderCode(orderCode: string): Promise<Order>;
  createOrder(
    requester: Requester,
    orderCreateDto: OrderCreateDto,
  ): Promise<number>;

  // Shipment
  calculateShippingFee(commune: string, province: string): Promise<string>;
}

export interface IOrderRepository
  extends IOrderCommandRepository,
    IOrderQueryRepository {}

export interface IOrderQueryRepository {
  // Order
  findOrdersByCustomerId(customerId: number): Promise<Order[]>;
  findOrderByOrderCode(orderCode: string): Promise<Order | null>;

  // Order Item
  findOrderItemsByOrderIds(orderIds: number[]): Promise<OrderItem[]>;

  // Order Status History
  findOrderStatusHistoryByOrderIds(
    orderIds: number[],
  ): Promise<OrderStatusHistory[]>;

  // Point Transaction
  findPointTransactionsByOrderIds(
    orderIds: number[],
  ): Promise<PointTransaction[]>;

  // Point Config
  getPointConfig(): Promise<PointConfig | null>;

  // Shipment
  findShipmentsByOrderIds(orderIds: number[]): Promise<Shipment[]>;
}

export interface IOrderCommandRepository {
  // Order
  insertOrder(data: Order): Promise<Order>;

  // Order Item
  insertOrderItems(data: OrderItem[]): Promise<void>;

  // Order Status History
  insertOrderStatusHistory(
    data: OrderStatusHistory,
  ): Promise<OrderStatusHistory>;

  // Point Transaction
  insertPointTransactions(
    data: PointTransaction[],
  ): Promise<void>;
}
