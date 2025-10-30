import { Requester } from '@app/contracts';
import {
  Cart,
  CartDto,
  CartItem,
  CartItemCreateDto,
  Order,
  OrderCreateDto,
  OrderDto,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  PointConfig,
  PointHistoryDto,
  PointTransaction,
  Shipment,
} from '@app/contracts/order';

export interface IOrderService {
  // Order
  getOrdersByCustomerId(requester: Requester): Promise<OrderDto[]>;
  getOrderByOrderCode(orderCode: string): Promise<Order>;
  getOrderById(orderId: number): Promise<Order>;
  createOrder(
    requester: Requester,
    orderCreateDto: OrderCreateDto,
  ): Promise<number>;
  updateOrderStatus(
    orderId: number,
    newStatus: OrderStatus,
    note?: string,
  ): Promise<void>;
  cancelOrder(requester: Requester, orderCode: string): Promise<void>;

  // Point Config
  getPointConfig(): Promise<PointConfig | null>;

  // Point Transaction
  getPointTransactionsByCustomerId(
    customerId: number,
  ): Promise<PointHistoryDto[]>;

  // Shipment
  calculateShippingFee(commune: string, province: string): Promise<string>;

  // Cart
  getCartByCustomerId(requester: Requester): Promise<CartDto>;
  addToCart(
    requester: Requester,
    cartItemCreateDto: CartItemCreateDto,
  ): Promise<number>;
  updateQuantity(
    requester: Requester,
    itemId: number,
    quantity: number,
  ): Promise<void>;
  deleteCartItems(requester: Requester, itemIds: number[]): Promise<void>;
}

export interface IOrderRepository
  extends IOrderCommandRepository,
    IOrderQueryRepository {}

export interface IOrderQueryRepository {
  // Order
  findOrdersByCustomerId(customerId: number): Promise<Order[]>;
  findOrderByOrderCode(orderCode: string): Promise<Order | null>;
  findOrderById(orderId: number): Promise<Order | null>;
  findOrdersByIds(orderIds: number[]): Promise<Order[]>;

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
  findPointTransactionsByCustomerId(
    customerId: number,
  ): Promise<PointTransaction[]>;

  // Point Config
  getPointConfig(): Promise<PointConfig | null>;

  // Shipment
  findShipmentsByOrderIds(orderIds: number[]): Promise<Shipment[]>;

  // Cart
  findCartByCustomerId(customerId: number): Promise<Cart | null>;

  // Cart Item
  findCartItemsByCartId(cartId: number): Promise<CartItem[]>;
  findCartItemByCartIdAndVariantIdAndColorId(
    cartId: number,
    variantId: number,
    colorId: number,
  ): Promise<CartItem | null>;
}

export interface IOrderCommandRepository {
  // Order
  insertOrder(data: Order): Promise<Order>;
  updateOrder(id: number, status: string): Promise<void>;

  // Order Item
  insertOrderItems(data: OrderItem[]): Promise<void>;

  // Order Status History
  insertOrderStatusHistory(
    data: OrderStatusHistory,
  ): Promise<OrderStatusHistory>;

  // Point Transaction
  insertPointTransactions(data: PointTransaction[]): Promise<void>;

  // Cart
  insertCart(data: Cart): Promise<Cart>;

  // Cart Item
  insertCartItem(data: CartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<void>;
  deleteCartItems(ids: number[]): Promise<void>;
}
