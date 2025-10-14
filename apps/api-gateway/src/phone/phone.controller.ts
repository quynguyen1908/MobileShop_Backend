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
  Inventory,
  PHONE_PATTERN,
  PHONE_SERVICE_NAME,
} from '@app/contracts/phone';
import type {
  Brand,
  PhoneFilterDto,
  PhoneVariantDto,
} from '@app/contracts/phone';
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

  @Get('variants/filter')
  @ApiOperation({
    summary: 'List phone variants with filtering and pagination',
  })
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
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    example: 35000000,
    description: 'Minimum price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    example: 36000000,
    description: 'Maximum price',
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
    description: 'Operating system',
  })
  @ApiQuery({
    name: 'minRam',
    required: false,
    type: Number,
    example: 8,
    description: 'Minimum RAM (GB)',
  })
  @ApiQuery({
    name: 'maxRam',
    required: false,
    type: Number,
    example: 12,
    description: 'Maximum RAM (GB)',
  })
  @ApiQuery({
    name: 'minStorage',
    required: false,
    type: Number,
    example: 512,
    description: 'Minimum storage (GB)',
  })
  @ApiQuery({
    name: 'maxStorage',
    required: false,
    type: Number,
    example: 1024,
    description: 'Maximum storage (GB)',
  })
  @ApiQuery({
    name: 'minScreenSize',
    required: false,
    type: Number,
    example: 6,
    description: 'Minimum screen size (inch)',
  })
  @ApiQuery({
    name: 'maxScreenSize',
    required: false,
    type: Number,
    example: 7,
    description: 'Maximum screen size (inch)',
  })
  @ApiQuery({
    name: 'nfc',
    required: false,
    type: Boolean,
    example: true,
    description: 'Whether NFC is supported',
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
                variantName: 'Ultra 1TB',
                description: 'Latest model with advanced features',
                phone: {
                  id: 1,
                  name: 'Samsung Galaxy S25',
                  brand: { id: 1, name: 'Samsung' },
                  category: { id: 9, name: 'Galaxy S25 Series', parentId: 5 },
                },
                colors: [
                  {
                    variantId: 1,
                    imageId: 1,
                    color: {
                      id: 1,
                      name: 'Đen',
                    },
                  },
                ],
                price: {
                  id: 1,
                  variantId: 1,
                  price: 44000000,
                  startDate: '2024-10-01T00:00:00.000Z',
                  endDate: null,
                },
                discount: {
                  id: 1,
                  variantId: 1,
                  discountPercent: 80,
                  startDate: '2024-10-01T00:00:00.000Z',
                  endDate: null,
                },
                images: [
                  {
                    id: 1,
                    variantId: 1,
                    image: {
                      id: 1,
                      imageUrl: 'https://example.com/samsung-galaxy-s25.jpg',
                    },
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
                reviews: [],
                averageRating: 0,
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
  async listPhoneVariants(
    @Query() pagingDto: PagingDto,
    @Query() filter: PhoneFilterDto,
    @Res() res: Response,
  ) {
    try {
      const paging = pagingDtoSchema.parse(pagingDto);
      const result = await this.circuitBreakerService.sendRequest<
        Paginated<PhoneVariantDto> | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.LIST_PHONE_VARIANTS,
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
          'Phone variants retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting phone variants failed';

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

@ApiTags('Brands')
@Controller('v1/brands')
export class BrandController {
  constructor(
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('/')
  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({
    status: 200,
    description: 'Brands retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Brands retrieved successfully',
          data: [
            { id: 1, name: 'Samsung' },
            { id: 2, name: 'Apple' },
          ],
        },
      },
    },
  })
  async getAllBrands(@Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        Brand[] | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_ALL_BRANDS,
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
          'Brands retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting brands failed';

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

@ApiTags('Inventory')
@Controller('v1/inventory')
export class InventoryController {
  constructor(
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get inventory information by SKU' })
  @ApiParam({
    name: 'sku',
    type: String,
    description: 'Product SKU code',
    example: 'IP14PM-1TB-BLK',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Inventory retrieved successfully',
          data: {
            id: 1,
            variantId: 1,
            sku: 'IP14PM-1TB-BLK',
            stockQuantity: 50,
          },
        },
      },
    },
  })
  async getInventoryBySku(@Param('sku') sku: string, @Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        Inventory | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_INVENTORY_BY_SKU,
        sku,
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
          'Inventory retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting inventory failed';

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
