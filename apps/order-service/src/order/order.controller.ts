import { Controller } from '@nestjs/common';
import { OrderService } from './order.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDER_PATTERN, OrderCreateDto } from '@app/contracts/order';
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
  async createOrder(@Payload() payload: { requester: Requester; orderCreateDto: OrderCreateDto }) {
    const { requester, orderCreateDto } = payload;
    return this.orderService.createOrder(requester, orderCreateDto);
  }
}
