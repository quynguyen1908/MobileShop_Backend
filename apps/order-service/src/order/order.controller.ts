import { Controller } from '@nestjs/common';
import { OrderService } from './order.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CartItemCreateDto,
  ORDER_PATTERN,
  OrderCreateDto,
} from '@app/contracts/order';
import type { Requester } from '@app/contracts/interface';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern(ORDER_PATTERN.GET_ORDERS_BY_CUSTOMER_ID)
  async getOrdersByCustomerId(@Payload() request: Requester) {
    return this.orderService.getOrdersByCustomerId(request);
  }

  @MessagePattern(ORDER_PATTERN.GET_ORDER_BY_ORDER_CODE)
  async getOrderByOrderCode(@Payload() orderCode: string) {
    return this.orderService.getOrderByOrderCode(orderCode);
  }

  @MessagePattern(ORDER_PATTERN.CALCULATE_SHIPPING_FEE)
  async calculateShippingFee(
    @Payload() data: { province: string; commune: string },
  ) {
    return this.orderService.calculateShippingFee(data.province, data.commune);
  }

  @MessagePattern(ORDER_PATTERN.CREATE_ORDER)
  async createOrder(
    @Payload()
    payload: {
      requester: Requester;
      orderCreateDto: OrderCreateDto;
    },
  ) {
    const { requester, orderCreateDto } = payload;
    return this.orderService.createOrder(requester, orderCreateDto);
  }

  @MessagePattern(ORDER_PATTERN.GET_CART_BY_CUSTOMER_ID)
  async getCartByCustomerId(@Payload() request: Requester) {
    return this.orderService.getCartByCustomerId(request);
  }

  @MessagePattern(ORDER_PATTERN.ADD_TO_CART)
  async addToCart(
    @Payload()
    payload: {
      requester: Requester;
      cartItemCreateDto: CartItemCreateDto;
    },
  ) {
    const { requester, cartItemCreateDto } = payload;
    return this.orderService.addToCart(requester, cartItemCreateDto);
  }

  @MessagePattern(ORDER_PATTERN.UPDATE_QUANTITY)
  async updateQuantity(
    @Payload() payload: { requester: Requester; itemId: number; quantity: number },
  ) {
    const { requester, itemId, quantity } = payload;
    await this.orderService.updateQuantity(requester, itemId, quantity);
    return { success: true };
  }

  @MessagePattern(ORDER_PATTERN.DELETE_CART_ITEMS)
  async deleteCartItems(
    @Payload() payload: { requester: Requester; itemIds: number[] },
  ) {
    const { requester, itemIds } = payload;
    await this.orderService.deleteCartItems(requester, itemIds);
    return { success: true };
  }
}
