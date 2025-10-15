import {
  AppError,
  ORDER_REPOSITORY,
  PHONE_SERVICE,
  USER_SERVICE,
} from '@app/contracts';
import type { Requester, LocationData, GHNShippingResponse } from '@app/contracts/interface';
import { Inject, Injectable } from '@nestjs/common';
import type { IOrderQueryRepository, IOrderService } from './order.port';
import {
  ErrLocationNotFound,
  ErrOrderNotFound,
  Order,
  OrderDto,
  OrderItem,
  OrderItemDto,
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
    private readonly orderRepository: IOrderQueryRepository,
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
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

  async calculateShippingFee(province: string, commune: string): Promise<string> {
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

  private async findLocationIds(
      province: string, commune: string
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

  private async toItemsDto(items: OrderItem[]): Promise<OrderItemDto[]> {
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
}
