import { Controller } from '@nestjs/common';
import { OrderService } from './order.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDER_PATTERN } from '@app/contracts/order';
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
}
