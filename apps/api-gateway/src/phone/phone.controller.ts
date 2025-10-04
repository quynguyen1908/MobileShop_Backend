import { pagingDtoSchema, PHONE_SERVICE } from '@app/contracts';
import type { Paginated, PagingDto } from '@app/contracts';
import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import {
  CategoryDto,
  PHONE_PATTERN,
  PHONE_SERVICE_NAME,
  PhoneDto,
} from '@app/contracts/phone';
import type { PhoneFilterDto } from '@app/contracts/phone';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { isFallbackResponse } from '../utils/fallback';
import { formatError } from '../utils/error';
import { ApiResponseDto } from '../dto/response.dto';
import type { Response } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Phones')
@Controller('v1/phones')
export class PhoneController {
  constructor(
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('/filter')
  @ApiOperation({ summary: 'List phones with filtering and pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Trang hiện tại',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số item mỗi trang',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    example: 35000000,
    description: 'Giá tối thiểu',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    example: 36000000,
    description: 'Giá tối đa',
  })
  @ApiQuery({
    name: 'chipset',
    required: false,
    type: String,
    example: 'Snapdragon',
    description: 'Chipset',
  })
  @ApiQuery({
    name: 'os',
    required: false,
    type: String,
    example: 'Android',
    description: 'Hệ điều hành',
  })
  @ApiQuery({
    name: 'minRam',
    required: false,
    type: Number,
    example: 8,
    description: 'RAM tối thiểu (GB)',
  })
  @ApiQuery({
    name: 'maxRam',
    required: false,
    type: Number,
    example: 12,
    description: 'RAM tối đa (GB)',
  })
  @ApiQuery({
    name: 'minStorage',
    required: false,
    type: Number,
    example: 512,
    description: 'ROM tối thiểu (GB)',
  })
  @ApiQuery({
    name: 'maxStorage',
    required: false,
    type: Number,
    example: 1024,
    description: 'ROM tối đa (GB)',
  })
  @ApiQuery({
    name: 'minScreenSize',
    required: false,
    type: Number,
    example: 6,
    description: 'Kích thước màn tối thiểu (inch)',
  })
  @ApiQuery({
    name: 'maxScreenSize',
    required: false,
    type: Number,
    example: 7,
    description: 'Kích thước màn tối đa (inch)',
  })
  @ApiQuery({
    name: 'nfc',
    required: false,
    type: Boolean,
    example: true,
    description: 'Có NFC hay không',
  })
  @ApiResponse({
    status: 200,
    description: 'Phones retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phones retrieved successfully',
          data: {
            data: [
              {
                id: 1,
                name: 'Samsung Galaxy S25',
                description:
                  'Samsung Galaxy S25 là điện thoại thông minh hàng đầu mới nhất của Samsung, ...',
                brand: { id: 1, name: 'Samsung' },
                category: { id: 3, name: 'Galaxy S25 Series', parentId: 2 },
                variants: [
                  {
                    id: 1,
                    phoneId: 1,
                    variantName: 'Ultra 1TB',
                    color: { id: 1, name: 'Đen' },
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
                        specification: { name: 'Kích thước màn hình' },
                      },
                      {
                        info: 'Dynamic AMOLED 2X',
                        specification: { name: 'Công nghệ màn hình' },
                      },
                    ],
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
  async listPhones(
    @Query() pagingDto: PagingDto,
    @Query() filter: PhoneFilterDto,
    @Res() res: Response,
  ) {
    try {
      const paging = pagingDtoSchema.parse(pagingDto);
      const result = await this.circuitBreakerService.sendRequest<
        Paginated<PhoneDto> | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.LIST_PHONES,
        { filter, paging },
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
          'Phones retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting phones failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get phone details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Phone ID', example: 1 })
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

@ApiTags('Categories')
@Controller('v1/categories')
export class CategoryController {
  constructor(
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('/')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Categories retrieved successfully',
          data: [
            {
              id: 1,
              name: 'Samsung',
              parentId: null,
              children: [
                {
                  id: 2,
                  name: 'Galaxy S Series',
                  parentId: 1,
                  children: [],
                },
              ],
            },
          ],
        },
      },
    },
  })
  async getAllCategories(@Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        CategoryDto[] | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_ALL_CATEGORIES,
        {},
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
          'Categories retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting categories failed';

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
