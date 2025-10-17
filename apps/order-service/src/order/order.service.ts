import {
  AppError,
  EVENT_PUBLISHER,
  ORDER_REPOSITORY,
  PHONE_SERVICE,
  USER_SERVICE,
} from '@app/contracts';
import type {
  Requester,
  LocationData,
  GHNShippingResponse,
  IEventPublisher,
} from '@app/contracts/interface';
import { Inject, Injectable } from '@nestjs/common';
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
  PointTransaction,
  PointType,
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
import { OrderCreatedEvent } from '@app/contracts/order/order.event';

interface LocationResult {
  wardId: number;
  districtId: number;
  found: boolean;
}

@Injectable()
export class OrderService implements IOrderService {
  private readonly csvFilePath: string;
  private readonly ghnApiUrl: string;
  private readonly ghnToken: string;
  private readonly ghnShopId: number;

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
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

    const pointConfig = await this.orderRepository.getPointConfig();
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
      totalAmount += item.discount * item.quantity;
    }

    const maxDiscountFromPoints = totalAmount * 0.1;

    let discountFromPoints = 0;
    if (orderCreateDto.pointUsed) {
      discountFromPoints = orderCreateDto.pointUsed * pointConfig.redeemRate;
      if (discountFromPoints > maxDiscountFromPoints) {
        discountFromPoints = maxDiscountFromPoints;
      }
    }

    let discountFromVoucher = 0;
    if (orderCreateDto.voucherIdApplied) {
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

    const { data: responseData } = await firstValueFrom(
      this.httpService
        .post<GHNShippingResponse>(
          `${this.ghnApiUrl}/shipping-order/fee`,
          {
            to_district_id: locationResult.districtId,
            to_ward_code: String(locationResult.wardId),
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
      this.phoneServiceClient.send(
        PHONE_PATTERN.CHECK_INVENTORY_AVAILABILITY,
        {
          variantId: cartItemCreateDto.variantId,
          colorId: cartItemCreateDto.colorId,
          requiredQuantity: cartItemCreateDto.quantity,
        },
      ),
    );
    if (!isAvailable) {
      throw new RpcException(
        AppError.from(new Error('Product is out of stock'), 400)
          .withLog('Inventory check failed')
          .toJson(false),
      );
    }

    const existingCartItem = await this.orderRepository.findCartItemByCartIdAndVariantIdAndColorId(
      cart.id!,
      cartItemCreateDto.variantId,
      cartItemCreateDto.colorId,
    );
  
    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + cartItemCreateDto.quantity;
      await this.orderRepository.updateCartItem(existingCartItem.id!, newQuantity);
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

  async deleteCartItems(requester: Requester, itemIds: number[]): Promise<void> {
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

  private async findLocationIds(
    province: string,
    commune: string,
  ): Promise<LocationResult> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.csvFilePath)) {
        console.error(`Location CSV file not found at: ${this.csvFilePath}`);
        resolve({ wardId: 0, districtId: 0, found: false });
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
              wardId: parseInt(record.WardID),
              districtId: parseInt(record.DistrictID),
              found: true,
            });
          } else {
            console.log(
              `No matching location found for commune "${commune}" in province "${province}"`,
            );
            resolve({ wardId: 0, districtId: 0, found: false });
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
          name: variant.phone.name,
          imageUrl: image.imageUrl,
        },
      } as CartItemDto;
    });

    return itemsDto;
  }
}
