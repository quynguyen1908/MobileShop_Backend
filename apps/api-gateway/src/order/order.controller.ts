import { ORDER_SERVICE } from '@app/contracts';
import type { ReqWithRequester } from '@app/contracts';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { RemoteAuthGuard } from '@app/contracts/auth';
import type { Response } from 'express';
import {
  Order,
  ORDER_PATTERN,
  ORDER_SERVICE_NAME,
  OrderDto,
} from '@app/contracts/order';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { isFallbackResponse } from '../utils/fallback';
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';

@ApiTags('Orders')
@Controller('v1/orders')
export class OrderController {
  constructor(
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('/me')
  @ApiOperation({ summary: 'Get current customer orders' })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Orders retrieved successfully',
          data: [
            {
              id: 1,
              customerId: 1,
              orderCode: 'ORD-001',
              orderDate: '2025-10-04T00:00:00.000Z',
              totalAmount: 35200000,
              discountAmount: 0,
              shippingFee: 0,
              finalAmount: 35200000,
              recipientName: 'John Doe',
              recipientPhone: '1234567890',
              street: '123 Nguyen Van Troi',
              status: 'pending',
              postalCode: '12345',
              commune: {
                id: 2677,
                code: 27043,
                name: 'Phường Đức Nhuận',
                divisionType: 'phường',
                codename: 'phuong_duc_nhuan',
                provinceCode: 79,
              },
              province: {
                id: 28,
                code: 79,
                name: 'Thành phố Hồ Chí Minh',
                divisionType: 'thành phố trung ương',
                codename: 'ho_chi_minh',
                phoneCode: 28,
              },
              items: [
                {
                  id: 1,
                  orderId: 1,
                  quantity: 1,
                  price: 44000000,
                  discount: 35200000,
                  variant: {
                    id: 1,
                    phoneId: 1,
                    variantName: 'Ultra 1TB',
                    color: 'Đen',
                    name: 'Samsung Galaxy S25',
                    imageUrl: 'https://example.com/samsung-galaxy-s25.jpg',
                  },
                },
              ],
              statusHistory: [
                {
                  id: 1,
                  orderId: 1,
                  status: 'pending',
                  createdAt: '2025-10-04T07:32:50.838Z',
                },
              ],
              transactions: [
                {
                  id: 1,
                  customerId: 1,
                  orderId: 1,
                  type: 'earn',
                  point: 352000,
                  moneyValue: 35200000,
                  createdAt: '2025-10-04T07:34:19.622Z',
                },
              ],
              shipments: [],
            },
          ],
        },
      },
    },
  })
  @UseGuards(RemoteAuthGuard)
  async getMyOrders(@Req() req: ReqWithRequester, @Res() res: Response) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        OrderDto | FallbackResponse
      >(
        this.orderServiceClient,
        ORDER_SERVICE_NAME,
        ORDER_PATTERN.GET_ORDERS_BY_CUSTOMER_ID,
        requester,
        () => {
          return {
            fallback: true,
            message: 'Order service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('Order service response:', JSON.stringify(result, null, 2));

      if (isFallbackResponse(result)) {
        const fallbackResponse = new ApiResponseDto(
          HttpStatus.SERVICE_UNAVAILABLE,
          result.message,
        );
        return res
          .status(HttpStatus.SERVICE_UNAVAILABLE)
          .json(fallbackResponse);
      } else {
        const response = new ApiResponseDto(
          HttpStatus.OK,
          'Orders retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting orders failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('code/:orderCode')
  @ApiOperation({ summary: 'Get order by order code' })
  @ApiParam({
    name: 'orderCode',
    type: String,
    description: 'The code of the order to retrieve',
    example: 'ORD-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Order retrieved successfully',
          data: {
            id: 1,
            customerId: 1,
            orderCode: 'ORD-001',
            orderDate: '2025-10-04T00:00:00.000Z',
            totalAmount: 35200000,
            discountAmount: 0,
            shippingFee: 0,
            finalAmount: 35200000,
            recipientName: 'John Doe',
            recipientPhone: '1234567890',
            street: '123 Nguyen Van Troi',
            status: 'pending',
            postalCode: '12345',
            communeId: 2677,
            provinceId: 28,
            createdAt: '2025-10-04T07:32:50.835Z',
            updatedAt: '2025-10-04T07:34:19.625Z',
            isDeleted: false,
          },
        },
      },
    },
  })
  async getOrderByOrderCode(
    @Param('orderCode') orderCode: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        Order | FallbackResponse
      >(
        this.orderServiceClient,
        ORDER_SERVICE_NAME,
        ORDER_PATTERN.GET_ORDER_BY_ORDER_CODE,
        orderCode,
        () => {
          return {
            fallback: true,
            message: 'Order service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('Order service response:', JSON.stringify(result, null, 2));

      if (isFallbackResponse(result)) {
        const fallbackResponse = new ApiResponseDto(
          HttpStatus.SERVICE_UNAVAILABLE,
          result.message,
        );
        return res
          .status(HttpStatus.SERVICE_UNAVAILABLE)
          .json(fallbackResponse);
      } else {
        const response = new ApiResponseDto(
          HttpStatus.OK,
          'Order retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting order failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }
}

@ApiTags('Shipment')
@Controller('v1/shipment')
export class ShipmentController {
  constructor(
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Post('fee')
  async calculateShippingFee(@Body() body: { province: string; commune: string }, @Res() res: Response) {
    const { province, commune } = body;

    if (!province || !commune) {
      const errorResponse = new ApiResponseDto(
        HttpStatus.BAD_REQUEST,
        'Province and commune query parameters are required',
      );
      return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    }

    try {
      const result = await this.circuitBreakerService.sendRequest<
        string | FallbackResponse
      >(
        this.orderServiceClient,
        ORDER_SERVICE_NAME,
        ORDER_PATTERN.CALCULATE_SHIPPING_FEE,
        { province, commune },
        () => {
          return {
            fallback: true,
            message: 'Order service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('Order service response:', JSON.stringify(result, null, 2));

      if (isFallbackResponse(result)) {
        const fallbackResponse = new ApiResponseDto(
          HttpStatus.SERVICE_UNAVAILABLE,
          result.message,
        );
        return res
          .status(HttpStatus.SERVICE_UNAVAILABLE)
          .json(fallbackResponse);
      } else {
        const response = new ApiResponseDto(
          HttpStatus.OK,
          'Shipping fee calculated successfully',
          { shippingFee: result },
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Calculating shipping fee failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }
}
