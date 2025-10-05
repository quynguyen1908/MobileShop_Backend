import {
  AppError,
  ORDER_REPOSITORY,
  PHONE_SERVICE,
  USER_SERVICE,
} from '@app/contracts';
import type { Requester } from '@app/contracts/interface';
import { Inject, Injectable } from '@nestjs/common';
import type { IOrderQueryRepository, IOrderService } from './order.port';
import {
  ErrOrderNotFound,
  OrderDto,
  OrderItem,
  OrderItemDto,
} from '@app/contracts/order';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ErrPhoneNotFound,
  ErrPhoneVariantNotFound,
  Phone,
  PHONE_PATTERN,
  VariantDto,
} from '@app/contracts/phone';
import {
  Commune,
  ErrCommuneNotFound,
  ErrCustomerNotFound,
  ErrProvinceNotFound,
  Province,
} from '@app/contracts/user/user.model';
import { CustomerDto } from '@app/contracts/user/user.dto';
import { USER_PATTERN } from '@app/contracts/user';

@Injectable()
export class OrderService implements IOrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderQueryRepository,
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
  ) {}

  async getOrdersByCustomerId(requester: Requester): Promise<OrderDto[]> {
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
    const orders = await this.orderRepository.findOrdersByCustomerId(
      customer.id,
    );
    if (!orders || orders.length === 0) {
      throw new RpcException(
        AppError.from(ErrOrderNotFound, 404)
          .withLog('Orders not found')
          .toJson(false),
      );
    }

    const orderIds = [...new Set(orders.map((order) => order.id))].filter(
      (id): id is number => typeof id === 'number',
    );

    const orderStatusHistories =
      await this.orderRepository.findOrderStatusHistoryByOrderIds(orderIds);
    const pointTransactions =
      await this.orderRepository.findPointTransactionsByOrderIds(orderIds);
    const shipments =
      await this.orderRepository.findShipmentsByOrderIds(orderIds);
    const orderItems =
      await this.orderRepository.findOrderItemsByOrderIds(orderIds);

    const orderItemsDto = await this.toItemsDto(orderItems);

    const communeIds = [
      ...new Set(orders.map((order) => order.communeId)),
    ].filter((id): id is number => typeof id === 'number');
    const provinceIds = [
      ...new Set(orders.map((order) => order.provinceId)),
    ].filter((id): id is number => typeof id === 'number');

    const communes = await firstValueFrom<Commune[]>(
      this.userServiceClient.send(USER_PATTERN.GET_COMMUNES_BY_IDS, communeIds),
    );
    if (!communes || communes.length === 0) {
      throw new RpcException(
        AppError.from(ErrCommuneNotFound, 404)
          .withLog('Communes not found for orders')
          .toJson(false),
      );
    }

    const provinces = await firstValueFrom<Province[]>(
      this.userServiceClient.send(
        USER_PATTERN.GET_PROVINCES_BY_IDS,
        provinceIds,
      ),
    );
    if (!provinces || provinces.length === 0) {
      throw new RpcException(
        AppError.from(ErrProvinceNotFound, 404)
          .withLog('Provinces not found for orders')
          .toJson(false),
      );
    }

    const orderDtos: OrderDto[] = orders.map((order) => {
      const items = orderItemsDto.filter((item) => item.orderId === order.id);
      const histories = orderStatusHistories
        .filter((history) => history.orderId === order.id)
        .map(
          ({ updatedAt: _updatedAt, isDeleted: _isDeleted, ...rest }) => rest,
        );
      const transactions = pointTransactions
        .filter((transaction) => transaction.orderId === order.id)
        .map(
          ({ updatedAt: _updatedAt, isDeleted: _isDeleted, ...rest }) => rest,
        );
      const orderShipments = shipments
        .filter((s) => s.orderId === order.id)
        .map(
          ({
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            isDeleted: _isDeleted,
            ...rest
          }) => rest,
        );

      const commune = communes.find((c) => c.id === order.communeId);
      if (!commune) {
        throw new RpcException(
          AppError.from(ErrCommuneNotFound, 404)
            .withLog('Commune not found for order')
            .toJson(false),
        );
      }

      const province = provinces.find((p) => p.id === order.provinceId);
      if (!province) {
        throw new RpcException(
          AppError.from(ErrProvinceNotFound, 404)
            .withLog('Province not found for order')
            .toJson(false),
        );
      }

      return {
        id: order.id,
        customerId: order.customerId,
        orderCode: order.orderCode,
        orderDate: order.orderDate,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        shippingFee: order.shippingFee,
        finalAmount: order.finalAmount,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        street: order.street,
        status: order.status,
        postalCode: order.postalCode,
        commune: {
          id: commune.id,
          code: commune.code,
          name: commune.name,
          divisionType: commune.divisionType,
          codename: commune.codename,
          provinceCode: commune.provinceCode,
        },
        province: {
          id: province.id,
          code: province.code,
          name: province.name,
          divisionType: province.divisionType,
          codename: province.codename,
          phoneCode: province.phoneCode,
        },
        items: items,
        statusHistory: histories,
        transactions: transactions,
        shipments: orderShipments,
      } as OrderDto;
    });

    return orderDtos;
  }

  private async toItemsDto(items: OrderItem[]): Promise<OrderItemDto[]> {
    const variantIds = [...new Set(items.map((item) => item.variantId))].filter(
      (id): id is number => typeof id === 'number',
    );
    const variants = await firstValueFrom<VariantDto[]>(
      this.phoneServiceClient.send(
        PHONE_PATTERN.GET_VARIANTS_BY_IDS,
        variantIds,
      ),
    );
    if (!variants || variants.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('Variants not found for order items')
          .toJson(false),
      );
    }

    const phoneIds = [
      ...new Set(variants.map((variant) => variant.phoneId)),
    ].filter((id): id is number => typeof id === 'number');
    const phones = await firstValueFrom<Phone[]>(
      this.phoneServiceClient.send(PHONE_PATTERN.GET_PHONES_BY_IDS, phoneIds),
    );

    if (!phones || phones.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneNotFound, 404)
          .withLog('Phones not found for order items')
          .toJson(false),
      );
    }

    const itemsDto: OrderItemDto[] = items.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new RpcException(
          AppError.from(ErrPhoneVariantNotFound, 404)
            .withLog('Variants not found for order items')
            .toJson(false),
        );
      }

      const phone = phones.find((p) => p.id === variant.phoneId);
      if (!phone) {
        throw new RpcException(
          AppError.from(ErrPhoneNotFound, 404)
            .withLog('Phone not found for variant in order item')
            .toJson(false),
        );
      }

      return {
        id: item.id,
        orderId: item.orderId,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        variant: {
          id: variant.id,
          phoneId: variant.phoneId,
          variantName: variant.variantName,
          color: variant.color.name,
          name: phone.name,
          imageUrl: variant.images.length > 0 ? variant.images[0].imageUrl : '',
        },
      } as OrderItemDto;
    });

    return itemsDto;
  }
}
