import {
  AppError,
  EVENT_PUBLISHER,
  GHNOrderResponse,
  ORDER_REPOSITORY,
  PAYMENT_SERVICE,
  PHONE_SERVICE,
  USER_SERVICE,
} from '@app/contracts';
import type {
  Requester,
  LocationData,
  GHNShippingResponse,
  IEventPublisher,
} from '@app/contracts/interface';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { IOrderRepository, IOrderService } from './order.port';
import {
  CartDto,
  CartItem,
  CartItemCreateDto,
  CartItemDto,
  ErrCartNotFound,
  ErrLocationNotFound,
  ErrOrderNotFound,
  Order,
  ORDER_SERVICE_NAME,
  OrderCreateDto,
  orderCreateDtoSchema,
  OrderDto,
  OrderItem,
  orderItemCreateDtoSchema,
  OrderItemDto,
  OrderStatus,
  PointConfig,
  PointHistoryDto,
  PointTransaction,
  PointType,
  Shipment,
  ShipmentStatus,
} from '@app/contracts/order';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom } from 'rxjs';
import {
  ErrPhoneVariantNotFound,
  ErrVariantColorNotFound,
  ErrVariantImagesNotFound,
  Image,
  PHONE_PATTERN,
  PhoneVariantDto,
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
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import { ConfigService } from '@nestjs/config';
import { formatCurrency, normalizeText } from '@app/contracts/utils';
import { HttpService } from '@nestjs/axios';
import {
  OrderCreatedEvent,
  OrderUpdatedEvent,
} from '@app/contracts/order/order.event';
import {
  PAYMENT_PATTERN,
  PaymentDto,
  PaymentStatus,
  PayMethod,
} from '@app/contracts/payment';

interface LocationResult {
  wardCode: string;
  districtId: number;
  found: boolean;
}

@Injectable()
export class OrderService implements IOrderService {
  private readonly csvFilePath: string;
  private readonly ghnApiUrl: string;
  private readonly ghnToken: string;
  private readonly ghnShopId: number;
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
    @Inject(PAYMENT_SERVICE) private readonly paymentServiceClient: ClientProxy,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.csvFilePath = path.join(process.cwd(), 'data/datasets', 'convert.csv');
    this.ghnApiUrl = this.configService.get<string>(
      'GHN_API_URL',
      'https://online-gateway.ghn.vn/shiip/public-api/v2',
    );
    this.ghnToken = this.configService.get<string>('GHN_API_KEY', '');
    this.ghnShopId = Number(this.configService.get<string>('GHN_SHOP_ID', '0'));
  }

  // Order

  async getOrdersByCustomerId(requester: Requester): Promise<OrderDto[]> {
    const customer = await this.validateRequester(requester);
    const orders = await this.orderRepository.findOrdersByCustomerId(
      customer.id!,
    );
    if (!orders || orders.length === 0) {
      return [];
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

    const orderItemsDto = await this.toOrderItemsDto(orderItems);

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

    const payments = await firstValueFrom<PaymentDto[]>(
      this.paymentServiceClient.send(
        PAYMENT_PATTERN.GET_PAYMENT_BY_ORDER_IDS,
        orderIds,
      ),
    );

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

      const payment = payments.filter((p) => p.orderId === order.id);

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
        payments: payment,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        isDeleted: order.isDeleted,
      } as OrderDto;
    });

    return orderDtos;
  }

  async getOrderById(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      throw new RpcException(
        AppError.from(ErrOrderNotFound, 404)
          .withLog('Order not found')
          .toJson(false),
      );
    }
    return order;
  }

  async getOrderByOrderCode(orderCode: string): Promise<Order> {
    const order = await this.orderRepository.findOrderByOrderCode(orderCode);
    if (!order) {
      throw new RpcException(
        AppError.from(ErrOrderNotFound, 404)
          .withLog('Order not found')
          .toJson(false),
      );
    }
    return order;
  }

  async createOrder(
    requester: Requester,
    orderCreateDto: OrderCreateDto,
  ): Promise<number> {
    const orderData = orderCreateDtoSchema.parse(orderCreateDto);
    const orderItemsData = orderItemCreateDtoSchema
      .array()
      .parse(orderCreateDto.items);

    const customer = await this.validateRequester(requester);

    const pointConfig = await this.getPointConfig();
    if (!pointConfig) {
      throw new RpcException(
        AppError.from(new Error('Point configuration not found'), 500)
          .withLog('Point configuration not found')
          .toJson(false),
      );
    }

    let totalAmount = 0;
    for (const item of orderItemsData) {
      const isAvailable = await firstValueFrom<boolean>(
        this.phoneServiceClient.send(
          PHONE_PATTERN.CHECK_INVENTORY_AVAILABILITY,
          {
            variantId: item.variantId,
            colorId: item.colorId,
            requiredQuantity: item.quantity,
          },
        ),
      );
      if (!isAvailable) {
        throw new RpcException(
          AppError.from(new Error('One or more items are out of stock'), 400)
            .withLog('Insufficient stock for order item')
            .toJson(false),
        );
      }

      if (item.discount === 0) {
        totalAmount += item.price * item.quantity;
      } else {
        totalAmount += item.discount * item.quantity;
      }
    }

    const maxDiscountFromPoints = totalAmount * 0.2;

    let discountFromPoints = 0;
    if (orderCreateDto.pointUsed) {
      discountFromPoints = orderCreateDto.pointUsed * pointConfig.redeemRate;
      if (discountFromPoints > maxDiscountFromPoints) {
        discountFromPoints = maxDiscountFromPoints;
      }
    }

    let discountFromVoucher = 0;
    if (
      orderCreateDto.voucherIdsApplied &&
      orderCreateDto.voucherIdsApplied.length > 0
    ) {
      // TODO: Validate voucher and calculate discount
      discountFromVoucher = 0;
    }

    const totalDiscount = discountFromPoints + discountFromVoucher;

    const finalAmount = totalAmount - totalDiscount + orderData.shippingFee;

    const order: Order = {
      customerId: customer.id!,
      orderCode: this.generateOrderCode('PH'),
      orderDate: new Date(),
      totalAmount: totalAmount,
      discountAmount: totalDiscount,
      shippingFee: orderData.shippingFee,
      finalAmount: finalAmount,
      recipientName: orderData.recipientName,
      recipientPhone: orderData.recipientPhone,
      provinceId: orderData.provinceId,
      communeId: orderData.communeId,
      street: orderData.street,
      postalCode: orderData.postalCode || '700000',
      status: OrderStatus.PENDING,
      isDeleted: false,
    };

    const createdOrder = await this.orderRepository.insertOrder(order);

    const items: OrderItem[] = orderItemsData.map((item) => ({
      orderId: createdOrder.id!,
      variantId: item.variantId,
      colorId: item.colorId,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount,
    }));

    await this.orderRepository.insertOrderItems(items);

    await this.orderRepository.insertOrderStatusHistory({
      orderId: createdOrder.id!,
      status: OrderStatus.PENDING,
      note: 'Đặt hàng thành công',
      isDeleted: false,
    });

    const pointTransactions: PointTransaction[] = [];

    if (orderCreateDto.pointUsed && orderCreateDto.pointUsed > 0) {
      pointTransactions.push({
        customerId: customer.id!,
        orderId: createdOrder.id!,
        type: PointType.REDEEM,
        moneyValue: discountFromPoints,
        points: discountFromPoints / pointConfig.redeemRate,
        isDeleted: false,
      });
    }

    await this.orderRepository.insertPointTransactions(pointTransactions);

    const event = OrderCreatedEvent.create(
      {
        id: createdOrder.id!,
        customerId: customer.id!,
        orderCode: createdOrder.orderCode,
        orderDate: createdOrder.orderDate,
        totalAmount: createdOrder.totalAmount,
        discountAmount: createdOrder.discountAmount,
        shippingFee: createdOrder.shippingFee,
        finalAmount: createdOrder.finalAmount,
        recipientName: createdOrder.recipientName,
        recipientPhone: createdOrder.recipientPhone,
        status: createdOrder.status,
        provinceId: createdOrder.provinceId,
        communeId: createdOrder.communeId,
        street: createdOrder.street,
        postalCode: createdOrder.postalCode ?? null,
        items,
        pointTransactions,
      },
      ORDER_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);

    return createdOrder.id!;
  }

  async updateOrderStatus(
    orderId: number,
    newStatus: OrderStatus,
    note?: string,
  ): Promise<void> {
    if (!Object.values(OrderStatus).includes(newStatus)) {
      throw new RpcException(
        new BadRequestException(`Invalid order status: ${newStatus}`),
      );
    }

    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new RpcException(
        AppError.from(ErrOrderNotFound, 404)
          .withLog(`Order not found: ${orderId}`)
          .toJson(false),
      );
    }

    if (!this.canUpdateOrderStatus(order)) {
      throw new RpcException(
        AppError.from(
          new Error('Cannot update status of a finalized order'),
          400,
        )
          .withLog(
            `Cannot update status of finalized order ${orderId} with status ${order.status}`,
          )
          .toJson(false),
      );
    }

    if (order.status === newStatus) {
      throw new RpcException(
        AppError.from(
          new Error('Order is already in the specified status'),
          400,
        )
          .withLog(`Order ${orderId} is already in status ${newStatus}`)
          .toJson(false),
      );
    }

    const statusHistories =
      await this.orderRepository.findOrderStatusHistoryByOrderIds([orderId]);

    for (const history of statusHistories) {
      if (history.status === newStatus) {
        throw new RpcException(
          AppError.from(
            new Error('Order has already been in the specified status before'),
            400,
          )
            .withLog(
              `Order ${orderId} has already been in status ${newStatus} before`,
            )
            .toJson(false),
        );
      }
    }

    const pointConfig = await this.getPointConfig();
    if (!pointConfig) {
      throw new RpcException(
        AppError.from(new Error('Point config not found'), 404)
          .withLog('Point config not found')
          .toJson(false),
      );
    }

    const payments = await firstValueFrom<PaymentDto[]>(
      this.paymentServiceClient.send(PAYMENT_PATTERN.GET_PAYMENT_BY_ORDER_IDS, [
        order.id!,
      ]),
    );

    let isNotPaid = true;
    let isCodPaid = false;

    switch (newStatus) {
      case OrderStatus.PAID: {
        if (order.status !== OrderStatus.PENDING) {
          throw new RpcException(
            AppError.from(
              new Error(
                'Order status can only be updated to PAID from PENDING',
              ),
              400,
            )
              .withLog(
                `Order ${orderId} status can only be updated to PAID from PENDING`,
              )
              .toJson(false),
          );
        }

        if (!payments || payments.length === 0) {
          throw new RpcException(
            AppError.from(new Error('Order has no payment records'), 400)
              .withLog(`Order ${orderId} has no payment records`)
              .toJson(false),
          );
        }

        for (const payment of payments) {
          if (payment.status === PaymentStatus.COMPLETED) {
            isNotPaid = false;
            break;
          }
        }

        if (isNotPaid) {
          throw new RpcException(
            AppError.from(new Error('Order has unpaid payments'), 400)
              .withLog(`Order ${orderId} has unpaid payments`)
              .toJson(false),
          );
        }

        await this.orderRepository.insertPointTransactions([
          {
            customerId: order.customerId,
            orderId: order.id!,
            type: PointType.EARN,
            moneyValue: order.finalAmount,
            points: Math.floor(order.finalAmount / pointConfig.earnRate),
            isDeleted: false,
          },
        ]);
        break;
      }
      case OrderStatus.PROCESSING: {
        if (order.status !== OrderStatus.PAID) {
          throw new RpcException(
            AppError.from(
              new Error(
                'Order status can only be updated to PROCESSING from PAID',
              ),
              400,
            )
              .withLog(
                `Order ${orderId} status can only be updated to PROCESSING from PAID`,
              )
              .toJson(false),
          );
        }
        break;
      }
      case OrderStatus.SHIPPED: {
        for (const payment of payments) {
          if (
            payment.status === PaymentStatus.COMPLETED &&
            payment.paymentMethod.code === PayMethod.COD.toString()
          ) {
            isCodPaid = true;
            break;
          }
        }

        const province = await firstValueFrom<Province[]>(
          this.userServiceClient.send(USER_PATTERN.GET_PROVINCES_BY_IDS, [
            order.provinceId,
          ]),
        );
        if (!province || province.length === 0) {
          throw new RpcException(
            AppError.from(ErrProvinceNotFound, 404)
              .withLog('Province not found for shipment')
              .toJson(false),
          );
        }

        const commune = await firstValueFrom<Commune[]>(
          this.userServiceClient.send(USER_PATTERN.GET_COMMUNES_BY_IDS, [
            order.communeId,
          ]),
        );
        if (!commune || commune.length === 0) {
          throw new RpcException(
            AppError.from(ErrCommuneNotFound, 404)
              .withLog('Commune not found for shipment')
              .toJson(false),
          );
        }

        const locationData = await this.findLocationIds(
          province[0].name,
          commune[0].name,
        );
        if (!locationData) {
          throw new RpcException(
            AppError.from(ErrLocationNotFound, 404)
              .withLog('Location not found for shipment')
              .toJson(false),
          );
        }

        const orderItems = await this.orderRepository.findOrderItemsByOrderIds([
          order.id!,
        ]);

        const orderItemDtos = await this.toOrderItemsDto(orderItems);

        const { data: responseData } = await firstValueFrom(
          this.httpService
            .post<GHNOrderResponse>(
              `${this.ghnApiUrl}/shipping-order/create`,
              {
                to_name: order.recipientName,
                to_phone: order.recipientPhone,
                required_note: 'KHONGCHOXEMHANG',
                weight: (
                  await this.orderRepository.findOrderItemsByOrderIds([
                    order.id!,
                  ])
                ).reduce((total, item) => total + item.quantity * 400, 0),
                service_type_id: 2,
                to_address:
                  order.street +
                  ', ' +
                  commune[0].name +
                  ', ' +
                  province[0].name,
                to_ward_code: locationData.wardCode,
                to_district_id: locationData.districtId,
                payment_type_id: isCodPaid ? 2 : 1,
                items: orderItemDtos.map((item) => ({
                  name:
                    item.variant.name +
                    ' ' +
                    item.variant.variantName +
                    ' - ' +
                    item.variant.color,
                  quantity: item.quantity,
                })),
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Token: this.ghnToken,
                  ShopId: this.ghnShopId,
                },
              },
            )
            .pipe(
              catchError((error: unknown) => {
                interface AxiosErrorResponse {
                  response?: {
                    data?: {
                      message?: string;
                    };
                  };
                  message?: string;
                }

                const axiosError = error as AxiosErrorResponse;

                console.error(
                  'GHN API Error:',
                  axiosError?.response?.data ||
                    axiosError?.message ||
                    'Unknown error',
                );

                const errorMessage =
                  axiosError?.response?.data?.message ||
                  axiosError?.message ||
                  'Unknown error';

                throw new RpcException(
                  AppError.from(new Error(errorMessage), 500)
                    .withLog('Failed to create shipment in GHN API')
                    .toJson(false),
                );
              }),
            ),
        );

        if (responseData.code === 200 && responseData.data) {
          const shipment: Shipment = {
            orderId: order.id!,
            trackingCode: responseData.data.order_code,
            provider: 'Giao Hàng Nhanh',
            status: ShipmentStatus.PENDING,
            fee: responseData.data.total_fee,
            estimatedDeliveryDate: new Date(
              responseData.data.expected_delivery_time,
            ),
            createdAt: new Date(),
            isDeleted: false,
          };

          await this.orderRepository.insertShipment(shipment);
        } else {
          throw new RpcException(
            AppError.from(
              new Error('Failed to create shipment in GHN API'),
              500,
            )
              .withLog(
                `GHN API responded with code ${responseData.code}: ${responseData.message}`,
              )
              .toJson(false),
          );
        }
        break;
      }
      case OrderStatus.DELIVERED: {
        if (order.status !== OrderStatus.SHIPPED) {
          throw new RpcException(
            AppError.from(
              new Error(
                'Order status can only be updated to DELIVERED from SHIPPED',
              ),
              400,
            )
              .withLog(
                `Order ${orderId} status can only be updated to DELIVERED from SHIPPED`,
              )
              .toJson(false),
          );
        }
        break;
      }
      default:
        break;
    }

    await this.orderRepository.updateOrder(orderId, newStatus.toString());

    await this.orderRepository.insertOrderStatusHistory({
      orderId: orderId,
      status: newStatus,
      note,
      isDeleted: false,
    });
  }

  async cancelOrder(requester: Requester, orderCode: string): Promise<void> {
    const customer = await this.validateRequester(requester);

    const order = await this.getOrderByOrderCode(orderCode);
    if (!order) {
      throw new RpcException(
        AppError.from(ErrOrderNotFound, 404)
          .withLog(`Order not found: ${orderCode}`)
          .toJson(false),
      );
    }

    if (order.customerId !== customer.id) {
      throw new RpcException(
        AppError.from(new Error('Unauthorized'), 403)
          .withLog(
            `Customer ${customer.id} is not authorized to cancel this order`,
          )
          .toJson(false),
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new RpcException(
        AppError.from(new Error('Only pending orders can be cancelled'), 400)
          .withLog(`Order ${orderCode} is not pending and cannot be cancelled`)
          .toJson(false),
      );
    }

    const pointTransactions =
      await this.orderRepository.findPointTransactionsByOrderIds([order.id!]);
    const redeemTransaction = pointTransactions.find(
      (tx) => tx.type === PointType.REDEEM,
    );

    if (redeemTransaction) {
      await this.orderRepository.insertPointTransactions([
        {
          customerId: order.customerId,
          orderId: order.id!,
          type: PointType.REFUND,
          moneyValue: redeemTransaction.moneyValue,
          points: redeemTransaction.points,
          isDeleted: false,
        },
      ]);
    }

    await this.updateOrderStatus(
      order.id!,
      OrderStatus.CANCELED,
      'Đã hủy (khách hàng yêu cầu)',
    );

    const items = await this.orderRepository.findOrderItemsByOrderIds([
      order.id!,
    ]);
    const points = await this.orderRepository.findPointTransactionsByOrderIds([
      order.id!,
    ]);

    const event = OrderUpdatedEvent.create(
      {
        id: order.id!,
        customerId: order.customerId,
        orderCode: order.orderCode,
        status: OrderStatus.CANCELED,
        items: items.map((item) => ({
          orderId: item.orderId,
          variantId: item.variantId,
          colorId: item.colorId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
        })),
        pointTransactions: points.map((tx) => ({
          customerId: tx.customerId,
          orderId: tx.orderId,
          type: tx.type,
          moneyValue: tx.moneyValue,
          points: tx.points,
          isDeleted: tx.isDeleted,
        })),
      },
      ORDER_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);
  }

  // Point Transaction

  async getPointTransactionsByCustomerId(
    customerId: number,
  ): Promise<PointHistoryDto[]> {
    const transactions =
      await this.orderRepository.findPointTransactionsByCustomerId(customerId);

    const orderIds = transactions
      .map((tx) => tx.orderId)
      .filter((id): id is number => typeof id === 'number');

    const orders = await this.orderRepository.findOrdersByIds(orderIds);

    const pointHistoryDtos: PointHistoryDto[] = transactions.map((tx) => {
      const order = orders.find((o) => o.id === tx.orderId);
      return {
        id: tx.id!,
        customerId: tx.customerId,
        type: tx.type,
        moneyValue: tx.moneyValue,
        points: tx.points,
        createdAt: tx.createdAt,
        orderCode: order?.orderCode ?? '',
      };
    });

    return pointHistoryDtos;
  }

  // Shipment

  async calculateShippingFee(
    province: string,
    commune: string,
  ): Promise<string> {
    const locationResult = await this.findLocationIds(province, commune);

    if (!locationResult.found) {
      throw new RpcException(
        AppError.from(ErrLocationNotFound, 404)
          .withLog('Location not found')
          .toJson(false),
      );
    }

    this.logger.log(
      `Calculated location IDs - District ID: ${locationResult.districtId}, Ward ID: ${locationResult.wardCode}`,
    );

    const { data: responseData } = await firstValueFrom(
      this.httpService
        .post<GHNShippingResponse>(
          `${this.ghnApiUrl}/shipping-order/fee`,
          {
            to_district_id: locationResult.districtId,
            to_ward_code: locationResult.wardCode,
            weight: 400,
            service_type_id: 2,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Token: this.ghnToken,
              ShopId: this.ghnShopId,
            },
          },
        )
        .pipe(
          catchError((error: unknown) => {
            interface AxiosErrorResponse {
              response?: {
                data?: {
                  message?: string;
                };
              };
              message?: string;
            }

            const axiosError = error as AxiosErrorResponse;

            console.error(
              'GHN API Error:',
              axiosError?.response?.data ||
                axiosError?.message ||
                'Unknown error',
            );

            const errorMessage =
              axiosError?.response?.data?.message ||
              axiosError?.message ||
              'Unknown error';

            throw new RpcException(
              AppError.from(new Error(errorMessage), 500)
                .withLog('Failed to fetch shipping fee from GHN API')
                .toJson(false),
            );
          }),
        ),
    );

    if (responseData.code === 200 && responseData.data) {
      const shippingData = responseData.data;

      return formatCurrency(shippingData.total);
    } else {
      throw new RpcException(
        AppError.from(
          new Error('Failed to fetch shipping fee from GHN API'),
          500,
        )
          .withLog(
            `GHN API responded with code ${responseData.code}: ${responseData.message}`,
          )
          .toJson(false),
      );
    }
  }

  // Point Config

  async getPointConfig(): Promise<PointConfig | null> {
    return this.orderRepository.getPointConfig();
  }

  // Cart

  async getCartByCustomerId(requester: Requester): Promise<CartDto> {
    const customer = await this.validateRequester(requester);

    const cart = await this.orderRepository.findCartByCustomerId(customer.id!);
    if (!cart) {
      const newCart = await this.orderRepository.insertCart({
        customerId: customer.id!,
        isDeleted: false,
      });

      return {
        id: newCart.id!,
        customerId: newCart.customerId,
        items: [],
      };
    }

    const cartItems = await this.orderRepository.findCartItemsByCartId(
      cart.id!,
    );
    if (!cartItems || cartItems.length === 0) {
      return {
        id: cart.id,
        customerId: cart.customerId,
        items: [],
      };
    }

    const cartItemsDto = await this.toCartItemsDto(cartItems);
    return {
      id: cart.id,
      customerId: cart.customerId,
      items: cartItemsDto,
    };
  }

  async addToCart(
    requester: Requester,
    cartItemCreateDto: CartItemCreateDto,
  ): Promise<number> {
    const customer = await this.validateRequester(requester);

    let cart = await this.orderRepository.findCartByCustomerId(customer.id!);
    if (!cart) {
      const newCart = await this.orderRepository.insertCart({
        customerId: customer.id!,
        isDeleted: false,
      });
      cart = newCart;
    }

    const isAvailable = await firstValueFrom<boolean>(
      this.phoneServiceClient.send(PHONE_PATTERN.CHECK_INVENTORY_AVAILABILITY, {
        variantId: cartItemCreateDto.variantId,
        colorId: cartItemCreateDto.colorId,
        requiredQuantity: cartItemCreateDto.quantity,
      }),
    );
    if (!isAvailable) {
      throw new RpcException(
        AppError.from(new Error('Product is out of stock'), 400)
          .withLog('Inventory check failed')
          .toJson(false),
      );
    }

    const existingCartItem =
      await this.orderRepository.findCartItemByCartIdAndVariantIdAndColorId(
        cart.id!,
        cartItemCreateDto.variantId,
        cartItemCreateDto.colorId,
      );

    if (existingCartItem) {
      const newQuantity =
        existingCartItem.quantity + cartItemCreateDto.quantity;
      await this.orderRepository.updateCartItem(
        existingCartItem.id!,
        newQuantity,
      );
      return existingCartItem.id!;
    }

    const cartItem: CartItem = {
      cartId: cart.id!,
      variantId: cartItemCreateDto.variantId,
      colorId: cartItemCreateDto.colorId,
      quantity: cartItemCreateDto.quantity,
      price: cartItemCreateDto.price,
      discount: cartItemCreateDto.discount,
    };
    const createdCartItem = await this.orderRepository.insertCartItem(cartItem);
    return createdCartItem.id!;
  }

  async updateQuantity(
    requester: Requester,
    itemId: number,
    quantity: number,
  ): Promise<void> {
    const customer = await this.validateRequester(requester);

    const cart = await this.orderRepository.findCartByCustomerId(customer.id!);
    if (!cart) {
      throw new RpcException(
        AppError.from(ErrCartNotFound, 404)
          .withLog('Cart not found for customer')
          .toJson(false),
      );
    }
    await this.orderRepository.updateCartItem(itemId, quantity);
  }

  async deleteCartItems(
    requester: Requester,
    itemIds: number[],
  ): Promise<void> {
    const customer = await this.validateRequester(requester);

    const cart = await this.orderRepository.findCartByCustomerId(customer.id!);
    if (!cart) {
      throw new RpcException(
        AppError.from(ErrCartNotFound, 404)
          .withLog('Cart not found for customer')
          .toJson(false),
      );
    }

    await this.orderRepository.deleteCartItems(itemIds);
  }

  private async validateRequester(requester: Requester): Promise<CustomerDto> {
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

    return customer;
  }

  private generateOrderCode(prefix: string): string {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);

    const datePart = `${day}${month}${year}`;

    const randomPart = Math.floor(1000 + Math.random() * 9000);

    return `${prefix}${datePart}${randomPart}`;
  }

  private canUpdateOrderStatus(order: Order): boolean {
    const updatableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
    ];
    return updatableStatuses.includes(order.status);
  }

  private async findLocationIds(
    province: string,
    commune: string,
  ): Promise<LocationResult> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.csvFilePath)) {
        console.error(`Location CSV file not found at: ${this.csvFilePath}`);
        resolve({ wardCode: '0', districtId: 0, found: false });
        return;
      }

      const matchingRecords: LocationData[] = [];

      fs.createReadStream(this.csvFilePath)
        .pipe(csv())
        .on('data', (row: LocationData) => {
          const normalizedInputCommune = normalizeText(commune);
          const normalizedInputProvince = normalizeText(province);

          const normalizedWardName = normalizeText(row.WardName || '');
          const normalizedWardNameNew = normalizeText(row.WardName_New || '');
          const normalizedProvinceName = normalizeText(row.ProvinceName || '');
          const normalizedProvinceNameNew = normalizeText(
            row.ProvinceName_New || '',
          );

          const communeMatches =
            normalizedWardName.includes(normalizedInputCommune) ||
            normalizedWardNameNew.includes(normalizedInputCommune) ||
            normalizedInputCommune.includes(normalizedWardName) ||
            normalizedInputCommune.includes(normalizedWardNameNew);

          const provinceMatches =
            normalizedProvinceName.includes(normalizedInputProvince) ||
            normalizedProvinceNameNew.includes(normalizedInputProvince) ||
            normalizedInputProvince.includes(normalizedProvinceName) ||
            normalizedInputProvince.includes(normalizedProvinceNameNew);

          if (communeMatches && provinceMatches) {
            matchingRecords.push(row);
          }
        })
        .on('end', () => {
          if (matchingRecords.length > 0) {
            const record = matchingRecords[0];

            resolve({
              wardCode: record.WardID,
              districtId: parseInt(record.DistrictID),
              found: true,
            });
          } else {
            console.log(
              `No matching location found for commune "${commune}" in province "${province}"`,
            );
            resolve({ wardCode: '0', districtId: 0, found: false });
          }
        })
        .on('error', (error: unknown) => {
          console.error('Error reading CSV file:', error);
          reject(new Error(`Error reading CSV file: ${String(error)}`));
        });
    });
  }

  private async toOrderItemsDto(items: OrderItem[]): Promise<OrderItemDto[]> {
    const variantIds = [...new Set(items.map((item) => item.variantId))].filter(
      (id): id is number => typeof id === 'number',
    );
    const variants = await firstValueFrom<PhoneVariantDto[]>(
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

    const imageIds = items
      .map((item) => {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new RpcException(
            AppError.from(ErrPhoneVariantNotFound, 404)
              .withLog('Variants not found for order items')
              .toJson(false),
          );
        }

        const matchingColor = variant.colors.find(
          (c) => c.color.id === item.colorId,
        );
        return matchingColor ? matchingColor.imageId : null;
      })
      .filter((id): id is number => typeof id === 'number' && id !== null);

    const variantImages = await firstValueFrom<Image[]>(
      this.phoneServiceClient.send(PHONE_PATTERN.GET_IMAGES_BY_IDS, imageIds),
    );
    if (!variantImages || variantImages.length === 0) {
      throw new RpcException(
        AppError.from(ErrVariantImagesNotFound, 404)
          .withLog('Images not found for order items')
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

      const matchingColor = variant.colors.find(
        (c) => c.color.id === item.colorId,
      );
      if (!matchingColor) {
        throw new RpcException(
          AppError.from(ErrVariantColorNotFound, 404)
            .withLog('Color not found for order item variant')
            .toJson(false),
        );
      }

      const image = variantImages.find(
        (img) => img.id === matchingColor.imageId,
      );
      if (!image) {
        throw new RpcException(
          AppError.from(ErrVariantImagesNotFound, 404)
            .withLog('Image not found for order item variant')
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
          phoneId: variant.phone.id,
          variantName: variant.variantName,
          color: matchingColor.color.name,
          colorId: matchingColor.color.id,
          name: variant.phone.name,
          imageUrl: image.imageUrl,
        },
      } as OrderItemDto;
    });

    return itemsDto;
  }

  private async toCartItemsDto(items: CartItem[]): Promise<CartItemDto[]> {
    const variantIds = [...new Set(items.map((item) => item.variantId))].filter(
      (id): id is number => typeof id === 'number',
    );
    const variants = await firstValueFrom<PhoneVariantDto[]>(
      this.phoneServiceClient.send(
        PHONE_PATTERN.GET_VARIANTS_BY_IDS,
        variantIds,
      ),
    );
    if (!variants || variants.length === 0) {
      throw new RpcException(
        AppError.from(ErrPhoneVariantNotFound, 404)
          .withLog('Variants not found for cart items')
          .toJson(false),
      );
    }

    const imageIds = items
      .map((item) => {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new RpcException(
            AppError.from(ErrPhoneVariantNotFound, 404)
              .withLog('Variants not found for cart items')
              .toJson(false),
          );
        }
        const matchingColor = variant.colors.find(
          (c) => c.color.id === item.colorId,
        );
        return matchingColor ? matchingColor.imageId : null;
      })
      .filter((id): id is number => typeof id === 'number' && id !== null);

    const variantImages = await firstValueFrom<Image[]>(
      this.phoneServiceClient.send(PHONE_PATTERN.GET_IMAGES_BY_IDS, imageIds),
    );
    if (!variantImages || variantImages.length === 0) {
      throw new RpcException(
        AppError.from(ErrVariantImagesNotFound, 404)
          .withLog('Images not found for cart items')
          .toJson(false),
      );
    }

    const itemsDto: CartItemDto[] = items.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new RpcException(
          AppError.from(ErrPhoneVariantNotFound, 404)
            .withLog('Variants not found for cart items')
            .toJson(false),
        );
      }
      const matchingColor = variant.colors.find(
        (c) => c.color.id === item.colorId,
      );
      if (!matchingColor) {
        throw new RpcException(
          AppError.from(ErrVariantColorNotFound, 404)
            .withLog('Color not found for cart item variant')
            .toJson(false),
        );
      }
      const image = variantImages.find(
        (img) => img.id === matchingColor.imageId,
      );
      if (!image) {
        throw new RpcException(
          AppError.from(ErrVariantImagesNotFound, 404)
            .withLog('Image not found for cart item variant')
            .toJson(false),
        );
      }

      return {
        id: item.id,
        cartId: item.cartId,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        variant: {
          id: variant.id,
          phoneId: variant.phone.id,
          variantName: variant.variantName,
          color: matchingColor.color.name,
          colorId: matchingColor.color.id,
          name: variant.phone.name,
          imageUrl: image.imageUrl,
        },
      } as CartItemDto;
    });

    return itemsDto;
  }
}
