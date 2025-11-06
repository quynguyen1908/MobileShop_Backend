import { pagingDtoSchema, VOUCHER_SERVICE } from '@app/contracts';
import type { Paginated, PagingDto } from '@app/contracts';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiOperation,
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
import { isFallbackResponse } from '../utils/fallback';

@ApiTags('Vouchers')
@Controller('v1/vouchers')
export class VoucherController {
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

      console.log('Voucher Service response:', JSON.stringify(result, null, 2));

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
        { timeout: 10000 },
      );

      console.log('Voucher Service response:', JSON.stringify(result, null, 2));

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
}
