import { ORDER_SERVICE } from '@app/contracts';
import type { ReqWithRequester } from '@app/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { RemoteAuthGuard } from '@app/contracts/auth';
import type { Response } from 'express';
import {
  CartDto,
  Order,
  ORDER_PATTERN,
  ORDER_SERVICE_NAME,
  OrderDto,
} from '@app/contracts/order';
import type { CartItemCreateDto, OrderCreateDto } from '@app/contracts/order';
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
  @ApiOperation({
    summary: 'Get current customer orders (requires authentication)',
  })
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

  @Post('create')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({ summary: 'Create a new order (requires authentication)' })
  @ApiBody({
    description: 'Order creation payload',
    schema: {
      type: 'object',
      properties: {
        totalAmount: { type: 'number', example: 43200000 },
        discountAmount: { type: 'number', example: 1000000 },
        shippingFee: { type: 'number', example: 34000 },
        finalAmount: { type: 'number', example: 42234000 },
        recipientName: { type: 'string', example: 'Max Johnson' },
        recipientPhone: { type: 'string', example: '0987654321' },
        street: { type: 'string', example: '456 Le Loi' },
        communeId: { type: 'number', example: 2677 },
        provinceId: { type: 'number', example: 28 },
        postalCode: { type: 'string', example: '67890' },
        voucherIdsApplied: {
          type: 'array',
          items: { type: 'number', example: 2 },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              variantId: { type: 'number', example: 3 },
              colorId: { type: 'number', example: 3 },
              quantity: { type: 'number', example: 1 },
              price: { type: 'number', example: 48000000 },
              discount: { type: 'number', example: 43200000 },
            },
            required: ['variantId', 'colorId', 'quantity', 'price', 'discount'],
          },
        },
        pointUsed: { type: 'number', example: 20000, nullable: true },
      },
      required: [
        'totalAmount',
        'discountAmount',
        'shippingFee',
        'finalAmount',
        'recipientName',
        'recipientPhone',
        'street',
        'communeId',
        'provinceId',
        'items',
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order created successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Order created successfully',
          data: { orderId: 1 },
        },
      },
    },
  })
  async createOrder(
    @Req() req: ReqWithRequester,
    @Body() body: OrderCreateDto,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.orderServiceClient,
        ORDER_SERVICE_NAME,
        ORDER_PATTERN.CREATE_ORDER,
        { requester, orderCreateDto: body },
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
          'Order created successfully',
          { orderId: result },
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Creating order failed';

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
  @ApiOperation({ summary: 'Calculate shipping fee' })
  @ApiResponse({
    status: 200,
    description: 'Shipping fee calculated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Shipping fee calculated successfully',
          data: { shippingFee: '34.000 ₫' },
        },
      },
    },
  })
  @ApiBody({
    description: 'Province and commune for shipping fee calculation',
    schema: {
      type: 'object',
      properties: {
        province: { type: 'string', example: 'Thành phố Hồ Chí Minh' },
        commune: { type: 'string', example: 'Phường Đức Nhuận' },
      },
      required: ['province', 'commune'],
    },
  })
  async calculateShippingFee(
    @Body() body: { province: string; commune: string },
    @Res() res: Response,
  ) {
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
      const errorMessage =
        typedError.logMessage || 'Calculating shipping fee failed';

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

@ApiTags('Cart')
@Controller('v1/cart')
export class CartController {
  constructor(
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('me')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Get current customer cart (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Cart retrieved successfully',
          data: {
            id: 1,
            customerId: 1,
            items: [
              {
                id: 2,
                cartId: 1,
                quantity: 1,
                price: 14000000,
                discount: 12600000,
                variant: {
                  id: 6,
                  phoneId: 3,
                  variantName: '5G 12GB 512GB',
                  color: 'Xám',
                  name: 'Xiaomi 14T',
                  imageUrl: 'https://example.com/xiaomi-14t.jpg',
                },
              },
            ],
          },
        },
      },
    },
  })
  async getMyCart(@Req() req: ReqWithRequester, @Res() res: Response) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        CartDto | FallbackResponse
      >(
        this.orderServiceClient,
        ORDER_SERVICE_NAME,
        ORDER_PATTERN.GET_CART_BY_CUSTOMER_ID,
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
          'Cart retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting cart failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('add')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({ summary: 'Add item to cart (requires authentication)' })
  @ApiBody({
    description: 'Cart item creation payload',
    schema: {
      type: 'object',
      properties: {
        variantId: { type: 'number', example: 6 },
        colorId: { type: 'number', example: 3 },
        quantity: { type: 'number', example: 1 },
        price: { type: 'number', example: 14000000 },
        discount: { type: 'number', example: 12600000 },
      },
      required: ['variantId', 'colorId', 'quantity', 'price', 'discount'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Item added to cart successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Item added to cart successfully',
          data: { cartItemId: 2 },
        },
      },
    },
  })
  async addToCart(
    @Req() req: ReqWithRequester,
    @Body() body: CartItemCreateDto,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.orderServiceClient,
        ORDER_SERVICE_NAME,
        ORDER_PATTERN.ADD_TO_CART,
        { requester, cartItemCreateDto: body },
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
          'Item added to cart successfully',
          { cartItemId: result },
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Adding to cart failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('quantity')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Update cart item quantity (requires authentication)',
  })
  @ApiBody({
    description: 'Cart item quantity update payload',
    schema: {
      type: 'object',
      properties: {
        itemId: { type: 'number', example: 2 },
        quantity: { type: 'number', example: 3 },
      },
      required: ['itemId', 'quantity'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item quantity updated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Cart item quantity updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updateQuantity(
    @Req() req: ReqWithRequester,
    @Body() body: { itemId: number; quantity: number },
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const { itemId, quantity } = body;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.orderServiceClient,
          ORDER_SERVICE_NAME,
          ORDER_PATTERN.UPDATE_QUANTITY,
          { requester, itemId, quantity },
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
          'Cart item quantity updated successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Updating cart item quantity failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Delete('items')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({ summary: 'Delete cart items (requires authentication)' })
  @ApiBody({
    description: 'Cart item IDs to delete',
    schema: {
      type: 'object',
      properties: {
        itemIds: {
          type: 'array',
          items: { type: 'number' },
          example: [2, 3],
        },
      },
      required: ['itemIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cart items deleted successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Cart items deleted successfully',
          data: { success: true },
        },
      },
    },
  })
  async deleteCartItems(
    @Req() req: ReqWithRequester,
    @Body() body: { itemIds: number[] },
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const { itemIds } = body;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.orderServiceClient,
          ORDER_SERVICE_NAME,
          ORDER_PATTERN.DELETE_CART_ITEMS,
          { requester, itemIds },
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
          'Cart items deleted successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Deleting cart items failed';

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
