import { Requester } from '@app/contracts';
import {
  Order,
  OrderDto,
  OrderItem,
  OrderStatusHistory,
  PointTransaction,
  Shipment,
} from '@app/contracts/order';

export interface IOrderService {
  // Order
  getOrdersByCustomerId(requester: Requester): Promise<OrderDto[]>;
  getOrderByOrderCode(orderCode: string): Promise<Order>;
}

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

  // Shipment
  findShipmentsByOrderIds(orderIds: number[]): Promise<Shipment[]>;
}
