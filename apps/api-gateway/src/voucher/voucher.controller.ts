import { pagingDtoSchema, VOUCHER_SERVICE } from '@app/contracts';
import type { Paginated, PagingDto } from '@app/contracts';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import type { Response } from 'express';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';
import {
  VOUCHER_PATTERN,
  VOUCHER_SERVICE_NAME,
  VoucherDto,
} from '@app/contracts/voucher';
import type {
  VoucherCreateDto,
  VoucherUpdateRequest,
} from '@app/contracts/voucher';
import { isFallbackResponse } from '../utils/fallback';
import { Roles, RoleType } from '@app/contracts/auth/roles.decorator';
import { RemoteAuthGuard } from '@app/contracts/auth';

@ApiTags('Vouchers')
@Controller('v1/vouchers')
export class VoucherController {
  private readonly logger = new Logger(VoucherController.name);

  constructor(
    @Inject(VOUCHER_SERVICE) private readonly voucherServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('list')
  @ApiOperation({ summary: 'List vouchers with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Current page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Vouchers retrieved successfully',
    content: {
      'application/json': {
        example: {
          statusCode: 200,
          message: 'Vouchers retrieved successfully',
          data: {
            data: [
              {
                id: 1,
                code: 'VNPPH300',
                title: 'VNPAY: Giảm 300K Cho Đơn Hàng Từ 10 triệu',
                description:
                  'Áp dụng khi thanh toán qua hình thức VNPAY và ...',
                discountType: 'amount',
                discountValue: 300000,
                minOrderValue: 10000000,
                maxDiscountValue: 300000,
                startDate: '2024-01-01T00:00:00.000Z',
                endDate: null,
                usageLimit: 1000,
                usageLimitPerUser: 1,
                usedCount: 0,
                appliesTo: 'payment_method',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                isDeleted: false,
                usageHistory: [],
                paymentMethods: [
                  {
                    voucherId: 1,
                    paymentMethod: {
                      id: 1,
                      code: 'VNPAY',
                      name: 'VNPAY',
                      createdAt: '2024-01-01T00:00:00.000Z',
                      updatedAt: '2024-01-01T00:00:00.000Z',
                      isDeleted: false,
                    },
                  },
                ],
              },
            ],
            paging: {
              page: 1,
              limit: 10,
              order: 'asc',
            },
            total: 1,
          },
        },
      },
    },
  })
  async listVouchers(@Query() pagingDto: PagingDto, @Res() res: Response) {
    try {
      const paging = pagingDtoSchema.parse(pagingDto);
      const result = await this.circuitBreakerService.sendRequest<
        Paginated<VoucherDto> | FallbackResponse
      >(
        this.voucherServiceClient,
        VOUCHER_SERVICE_NAME,
        VOUCHER_PATTERN.LIST_VOUCHERS,
        paging,
        () => {
          return {
            fallback: true,
            message: 'Voucher service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      this.logger.log(
        'Voucher Service response:',
        JSON.stringify(result, null, 2),
      );

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
          'Vouchers retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting vouchers failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('variants')
  @ApiOperation({ summary: 'Get vouchers by phone variant IDs' })
  @ApiBody({
    description: 'Array of phone variant IDs',
    required: true,
    schema: {
      type: 'object',
      properties: {
        variantIds: {
          type: 'array',
          items: { type: 'number', example: 1 },
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vouchers retrieved successfully',
    content: {
      'application/json': {
        example: {
          statusCode: 200,
          message: 'Vouchers retrieved successfully',
          data: [
            {
              id: 1,
              code: 'VNPPH300',
              title: 'VNPAY: Giảm 300K Cho Đơn Hàng Từ 10 triệu',
              description: 'Áp dụng khi thanh toán qua hình thức VNPAY và ...',
              discountType: 'amount',
              discountValue: 300000,
              minOrderValue: 10000000,
              maxDiscountValue: 300000,
              startDate: '2024-01-01T00:00:00.000Z',
              endDate: null,
              usageLimit: 1000,
              usageLimitPerUser: 1,
              usedCount: 0,
              appliesTo: 'payment_method',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              isDeleted: false,
              usageHistory: [],
              paymentMethods: [
                {
                  voucherId: 1,
                  paymentMethod: {
                    id: 1,
                    code: 'VNPAY',
                    name: 'VNPAY',
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                    isDeleted: false,
                  },
                },
              ],
            },
          ],
        },
      },
    },
  })
  async getVouchersByVariantIds(
    @Body() body: { variantIds: number[] },
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        VoucherDto[] | FallbackResponse
      >(
        this.voucherServiceClient,
        VOUCHER_SERVICE_NAME,
        VOUCHER_PATTERN.GET_VOUCHERS_BY_VARIANT_IDS,
        body.variantIds,
        () => {
          return {
            fallback: true,
            message: 'Voucher service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 30000 },
      );

      this.logger.log(
        'Voucher Service response:',
        JSON.stringify(result, null, 2),
      );

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
          'Vouchers retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting vouchers by variant IDs failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post()
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create a new voucher (Admin only)' })
  @ApiBody({
    description: 'Voucher creation data',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NEWYEAR2025' },
        title: { type: 'string', example: 'New Year 2025 Discount' },
        description: {
          type: 'string',
          example: 'Get 15% off on all orders for New Year 2025',
        },
        discountType: { type: 'string', example: 'percent' },
        discountValue: { type: 'number', example: 15 },
        minOrderValue: { type: 'number', example: 5000000 },
        maxDiscountValue: { type: 'number', example: 1000000 },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-01T00:00:00.000Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-31T23:59:59.000Z',
        },
        usageLimit: { type: 'number', example: 500 },
        usageLimitPerUser: { type: 'number', example: 1 },
        appliesTo: { type: 'string', example: 'category' },
        categories: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2],
        },
        paymentMethods: { type: 'number', example: 1 },
      },
      required: [
        'code',
        'title',
        'description',
        'discountType',
        'discountValue',
        'minOrderValue',
        'maxDiscountValue',
        'startDate',
        'usageLimit',
        'usageLimitPerUser',
        'appliesTo',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Voucher created successfully',
    content: {
      'application/json': {
        example: {
          statusCode: 201,
          message: 'Voucher created successfully',
          data: { voucherId: 1 },
        },
      },
    },
  })
  async createVoucher(
    @Body() voucherCreateDto: VoucherCreateDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.voucherServiceClient,
        VOUCHER_SERVICE_NAME,
        VOUCHER_PATTERN.CREATE_VOUCHER,
        voucherCreateDto,
        () => {
          return {
            fallback: true,
            message: 'Voucher service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      this.logger.log(
        'Voucher Service response:',
        JSON.stringify(result, null, 2),
      );

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
          HttpStatus.CREATED,
          'Voucher created successfully',
          { voucherId: result },
        );
        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Creating voucher failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put(':voucherId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Update an existing voucher (Admin only)' })
  @ApiParam({
    name: 'voucherId',
    type: Number,
    description: 'ID of the voucher to update',
    example: 1,
  })
  @ApiBody({
    description: 'Voucher update data',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Updated Voucher Title' },
        description: {
          type: 'string',
          example: 'Updated description of the voucher',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-12-31T23:59:59.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Voucher updated successfully',
    content: {
      'application/json': {
        example: {
          statusCode: 200,
          message: 'Voucher updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updateVoucher(
    @Param('voucherId') voucherId: number,
    @Body() voucherUpdateDto: VoucherUpdateRequest,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.voucherServiceClient,
          VOUCHER_SERVICE_NAME,
          VOUCHER_PATTERN.UPDATE_VOUCHER,
          { id: voucherId, voucherUpdateDto },
          () => {
            return {
              fallback: true,
              message: 'Voucher service is temporarily unavailable',
            } as FallbackResponse;
          },
          { timeout: 10000 },
        );

      this.logger.log(
        'Voucher Service response:',
        JSON.stringify(result, null, 2),
      );

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
          'Voucher updated successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Updating voucher failed';

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
