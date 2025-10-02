import { PHONE_SERVICE } from '@app/contracts';
import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Res,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import {
  PHONE_PATTERN,
  PHONE_SERVICE_NAME,
  PhoneDto,
} from '@app/contracts/phone';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { isFallbackResponse } from '../utils/fallback';
import { formatError } from '../utils/error';
import { ApiResponseDto } from '../dto/response.dto';
import type { Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Phones')
@Controller('v1/phones')
export class PhoneController {
  constructor(
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('/:id')
  @ApiOperation({ summary: 'Get phone details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Phone details retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phone details retrieved successfully',
          data: {
            id: 1,
            name: 'Samsung Galaxy S25',
            description:
              'Samsung Galaxy S25 là điện thoại thông minh hàng đầu mới nhất của Samsung, ...',
            brand: {
              id: 1,
              name: 'Samsung',
            },
            category: {
              id: 3,
              name: 'Galaxy S25 Series',
              parentId: 2,
            },
            variants: [
              {
                id: 1,
                phoneId: 1,
                variantName: 'Ultra 1TB',
                color: {
                  id: 1,
                  name: 'Đen',
                },
                price: {
                  id: 1,
                  variantId: 1,
                  price: 44000000,
                  startDate: '2025-09-30T17:00:00.000Z',
                  endDate: null,
                },
                discount: {
                  id: 1,
                  variantId: 1,
                  discountPercent: 20,
                  startDate: '2025-09-30T17:00:00.000Z',
                  endDate: null,
                },
                images: [
                  {
                    id: 1,
                    variantId: 1,
                    imageUrl:
                      'https://example.com/images/samsung-galaxy-s25-ultra-1tb-black-front.jpg',
                  },
                ],
                specifications: [
                  {
                    info: '6.9 inches',
                    specification: {
                      name: 'Kích thước màn hình',
                    },
                  },
                  {
                    info: 'Dynamic AMOLED 2X',
                    specification: {
                      name: 'Công nghệ màn hình',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    },
  })
  async getPhoneDetails(@Param('id') phoneId: number, @Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        PhoneDto | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_PHONE,
        phoneId,
        () => {
          return {
            fallback: true,
            message: 'Phone service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 5000 },
      );

      console.log('Phone Service response:', JSON.stringify(result, null, 2));

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
          'Phone details retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting phone details failed';

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
