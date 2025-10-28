import { pagingDtoSchema, PHONE_SERVICE } from '@app/contracts';
import type { Paginated, PagingDto } from '@app/contracts';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
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
  BrandCreateDto,
  CategoryCreateDto,
  CategoryUpdateDto,
  Color,
  PhoneCreateDto,
  PhoneFilterDto,
  PhoneUpdateDto,
  PhoneVariantCreateDto,
  PhoneVariantDto,
  PhoneVariantUpdateDto,
  PhoneWithVariantsDto,
  Specification,
} from '@app/contracts/phone';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { isFallbackResponse } from '../utils/fallback';
import { formatError } from '../utils/error';
import { ApiResponseDto } from '../dto/response.dto';
import type { Response } from 'express';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RemoteAuthGuard } from '@app/contracts/auth';
import { Roles, RoleType } from '@app/contracts/auth/roles.decorator';

@ApiTags('Phones')
@Controller('v1/phones')
export class PhoneController {
  constructor(
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('list')
  @ApiOperation({ summary: 'List phones with pagination' })
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
                brand: {
                  id: 1,
                  name: 'Samsung',
                  image: {
                    id: 9,
                    imageUrl: 'https://example.com/brands/samsung.png',
                  },
                },
                category: {
                  id: 9,
                  name: 'Galaxy S25 Series',
                  parentId: 5,
                },
                createdAt: '2024-10-01T00:00:00.000Z',
                updatedAt: '2024-10-01T00:00:00.000Z',
                isDeleted: false,
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
  async listPhones(@Query() pagingDto: PagingDto, @Res() res: Response) {
    try {
      const paging = pagingDtoSchema.parse(pagingDto);
      const result = await this.circuitBreakerService.sendRequest<
        Paginated<PhoneWithVariantsDto> | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.LIST_PHONES,
        paging,
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

  @Post('create')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.SALES)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create a new phone (Admin/Sales only)' })
  @ApiBody({
    description: 'Phone creation payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'iPhone 16e' },
        brandId: { type: 'number', example: 2 },
        categoryId: { type: 'number', example: 6 },
        variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              variantName: { type: 'string', example: '128GB' },
              description: {
                type: 'string',
                example:
                  'iPhone 16e được trang bị màn hình Super Retina XDR 6.1inch, ...',
              },
              colors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    colorId: { type: 'number', example: 6 },
                    imageUrl: {
                      type: 'string',
                      example: 'https://www.apple.com/example-image-1.jpg',
                    },
                  },
                  required: ['colorId', 'imageUrl'],
                },
              },
              price: { type: 'number', example: 17000000 },
              discountPercent: { type: 'number', example: 15 },
              images: {
                type: 'array',
                items: {
                  type: 'string',
                  example: 'https://www.apple.com/example-image-2.jpg',
                },
              },
              specifications: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    specId: { type: 'number', example: 1 },
                    info: { type: 'string', example: '6.1' },
                    unit: { type: 'string', example: 'inch' },
                  },
                  required: ['specId', 'info'],
                },
              },
            },
            required: [
              'variantName',
              'description',
              'colors',
              'price',
              'images',
              'specifications',
            ],
          },
        },
      },
      required: ['name', 'brandId', 'categoryId', 'variants'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Phone created successfully',
    content: {
      'application/json': {
        example: {
          status: 201,
          message: 'Phone created successfully',
          data: {
            phoneId: 10,
          },
        },
      },
    },
  })
  async createPhone(
    @Body() phoneCreateDto: PhoneCreateDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.CREATE_PHONE,
        phoneCreateDto,
        () => {
          return {
            fallback: true,
            message: 'Phone service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
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
          HttpStatus.CREATED,
          'Phone created successfully',
          { phoneId: result },
        );
        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Creating phone failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('update/:phoneId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.SALES)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Update a phone (Admin/Sales only)' })
  @ApiParam({
    name: 'phoneId',
    type: Number,
    description: 'Phone ID',
    example: 10,
  })
  @ApiBody({
    description: 'Phone update payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'iPhone 16e Updated' },
        brandId: { type: 'number', example: 2 },
        categoryId: { type: 'number', example: 6 },
      },
      required: [],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Phone updated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phone updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updatePhone(
    @Param('phoneId') phoneId: number,
    @Body() data: PhoneUpdateDto,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.UPDATE_PHONE,
          { id: phoneId, data },
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
          'Phone updated successfully',
          result,
        );

        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Updating phone failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );

      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('delete/:phoneId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.SALES)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Soft delete a phone (Admin/Sales only)' })
  @ApiParam({
    name: 'phoneId',
    type: Number,
    description: 'Phone ID',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Phone deleted successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phone deleted successfully',
          data: { success: true },
        },
      },
    },
  })
  async deletePhone(@Param('phoneId') phoneId: number, @Res() res: Response) {
    try {
      const id: number = phoneId;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.DELETE_PHONE,
          id,
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
          'Phone deleted successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Deleting phone failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

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
    name: 'brand',
    required: false,
    type: String,
    example: 'Samsung',
    description: 'Brand name',
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
    description: 'Phone variants retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phone variants retrieved successfully',
          data: {
            data: [
              {
                id: 1,
                variantName: 'Ultra 1TB',
                description: 'Latest model with advanced features',
                phone: {
                  id: 1,
                  name: 'Samsung Galaxy S25',
                  brand: {
                    id: 1,
                    name: 'Samsung',
                    image: {
                      id: 1,
                      imageUrl: 'https://example.com/brands/samsung.png',
                    },
                  },
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
                  discountPercent: 20,
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

  @Get('variants/:variantId')
  @ApiOperation({ summary: 'Get phone variant by ID' })
  @ApiParam({
    name: 'variantId',
    type: Number,
    description: 'Phone variant ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Phone variant retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phone variant retrieved successfully',
          data: {
            id: 1,
            variantName: 'Ultra 1TB',
            description: 'Latest model with advanced features',
            phone: {
              id: 1,
              name: 'Samsung Galaxy S25',
              brand: {
                id: 1,
                name: 'Samsung',
                image: {
                  id: 1,
                  imageUrl: 'https://example.com/brands/samsung.png',
                },
              },
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
              discountPercent: 20,
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
        },
      },
    },
  })
  async getVariantById(
    @Param('variantId') variantId: number,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        PhoneVariantDto | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_VARIANT_BY_ID,
        variantId,
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
          'Phone variant retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting phone variant failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('variants/:variantId/related')
  @ApiOperation({ summary: 'Get related phone variants by variant ID' })
  @ApiParam({
    name: 'variantId',
    type: Number,
    description: 'Phone variant ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Related phone variants retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Related phone variants retrieved successfully',
          data: [
            {
              id: 1,
              variantName: 'Ultra 1TB',
              description: 'Latest model with advanced features',
              phone: {
                id: 1,
                name: 'Samsung Galaxy S25',
                brand: {
                  id: 1,
                  name: 'Samsung',
                  image: {
                    id: 1,
                    imageUrl: 'https://example.com/brands/samsung.png',
                  },
                },
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
                discountPercent: 20,
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
        },
      },
    },
  })
  async getRelatedVariants(
    @Param('variantId') variantId: number,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        PhoneVariantDto[] | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_RELATED_VARIANTS,
        variantId,
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
          'Related phone variants retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting related phone variants failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('variants/create')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.SALES)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create a new phone variant (Admin/Sales only)' })
  @ApiBody({
    description: 'Phone variant creation payload',
    schema: {
      type: 'object',
      properties: {
        phoneId: { type: 'number', example: 1 },
        data: {
          type: 'object',
          properties: {
            variantName: { type: 'string', example: '128GB' },
            description: {
              type: 'string',
              example:
                'iPhone 16e được trang bị màn hình Super Retina XDR 6.1inch, ...',
            },
            colors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  colorId: { type: 'number', example: 6 },
                  imageUrl: {
                    type: 'string',
                    example: 'https://www.apple.com/example-image-1.jpg',
                  },
                },
                required: ['colorId', 'imageUrl'],
              },
            },
            price: { type: 'number', example: 17000000 },
            discountPercent: { type: 'number', example: 15 },
            images: {
              type: 'array',
              items: {
                type: 'string',
                example: 'https://www.apple.com/example-image-2.jpg',
              },
            },
            specifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  specId: { type: 'number', example: 1 },
                  info: { type: 'string', example: '6.1' },
                  unit: { type: 'string', example: 'inch' },
                },
                required: ['specId', 'info'],
              },
            },
          },
          required: [
            'variantName',
            'description',
            'colors',
            'price',
            'images',
            'specifications',
          ],
        },
      },
      required: ['phoneId', 'data'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Phone variant created successfully',
    content: {
      'application/json': {
        example: {
          status: 201,
          message: 'Phone variant created successfully',
          data: { phoneVariantId: 15 },
        },
      },
    },
  })
  async createPhoneVariant(
    @Body() body: { phoneId: number; data: PhoneVariantCreateDto },
    @Res() res: Response,
  ) {
    try {
      const { phoneId, data } = body;
      const result = await this.circuitBreakerService.sendRequest<
        PhoneVariantDto | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.CREATE_PHONE_VARIANT,
        { phoneId, phoneVariantCreateDto: data },
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
          HttpStatus.CREATED,
          'Phone variant created successfully',
          { phoneVariantId: result },
        );
        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Creating phone variant failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('variants/update/:variantId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.SALES)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Update a phone variant (Admin/Sales only)' })
  @ApiParam({
    name: 'variantId',
    type: Number,
    description: 'Phone variant ID',
    example: 1,
  })
  @ApiBody({
    description: 'Phone variant update payload',
    schema: {
      type: 'object',
      properties: {
        variantName: { type: 'string', example: '128GB' },
        description: { type: 'string', example: 'Updated description ...' },
        colors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              colorId: { type: 'number', example: 6 },
              newColorId: { type: 'number', example: 7 },
              imageUrl: {
                type: 'string',
                example: 'https://www.apple.com/example-image-1.jpg',
              },
              isDeleted: { type: 'boolean', example: false },
            },
            required: ['colorId'],
          },
        },
        price: { type: 'number', example: 17000000 },
        discountPercent: { type: 'number', example: 15 },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 10 },
              imageUrl: {
                type: 'string',
                example: 'https://www.apple.com/example-image-2.jpg',
              },
              isDeleted: { type: 'boolean', example: false },
            },
            required: ['imageUrl'],
          },
        },
        specifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              specId: { type: 'number', example: 1 },
              newSpecId: { type: 'number', example: 2 },
              info: { type: 'string', example: '6.1' },
              unit: { type: 'string', example: 'inch' },
              isDeleted: { type: 'boolean', example: false },
            },
            required: ['specId'],
          },
        },
      },
      required: [],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Phone variant updated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phone variant updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updatePhoneVariant(
    @Param('variantId') variantId: number,
    @Body() data: PhoneVariantUpdateDto,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.UPDATE_PHONE_VARIANT,
          { id: variantId, data },
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
          'Phone variant updated successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Updating phone variant failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('variants/delete/:variantId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.SALES)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Soft delete a phone variant (Admin/Sales only)' })
  @ApiParam({
    name: 'variantId',
    type: Number,
    description: 'Phone variant ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Phone variant deleted successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Phone variant deleted successfully',
          data: { success: true },
        },
      },
    },
  })
  async deletePhoneVariant(
    @Param('variantId') variantId: number,
    @Res() res: Response,
  ) {
    try {
      const id: number = variantId;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.DELETE_PHONE_VARIANT,
          id,
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
          'Phone variant deleted successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Deleting phone variant failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('colors')
  @ApiOperation({ summary: 'Get all phone colors' })
  @ApiResponse({
    status: 200,
    description: 'Colors retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Colors retrieved successfully',
          data: [
            {
              id: 1,
              name: 'Đen',
            },
          ],
        },
      },
    },
  })
  async getAllColors(@Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        Color[] | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_ALL_COLORS,
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
          'Colors retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting colors failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('colors/create')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Create a new color (Admin/Sales only)' })
  @ApiBody({
    description: 'Color creation payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Xanh dương' },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Color created successfully',
    content: {
      'application/json': {
        example: {
          status: 201,
          message: 'Color created successfully',
          data: { colorId: 7 },
        },
      },
    },
  })
  async createColor(@Body() body: { name: string }, @Res() res: Response) {
    try {
      const { name } = body;
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.CREATE_COLOR,
        name,
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
          HttpStatus.CREATED,
          'Color created successfully',
          { colorId: result },
        );
        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Creating color failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('specifications')
  @ApiOperation({ summary: 'Get all phone specifications' })
  @ApiResponse({
    status: 200,
    description: 'Specifications retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Specifications retrieved successfully',
          data: [
            {
              id: 1,
              name: 'Kích thước màn hình',
            },
          ],
        },
      },
    },
  })
  async getAllSpecifications(@Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        Specification[] | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.GET_ALL_SPECIFICATIONS,
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
          'Specifications retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting specifications failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('specifications/create')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Create a new specification (Admin/Sales only)' })
  @ApiBody({
    description: 'Specification creation payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Dung lượng pin' },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Specification created successfully',
    content: {
      'application/json': {
        example: {
          status: 201,
          message: 'Specification created successfully',
          data: { specificationId: 8 },
        },
      },
    },
  })
  async createSpecification(
    @Body() body: { name: string },
    @Res() res: Response,
  ) {
    try {
      const { name } = body;
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.CREATE_SPECIFICATION,
        name,
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
          HttpStatus.CREATED,
          'Specification created successfully',
          { specificationId: result },
        );
        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Creating specification failed';

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
            {
              id: 1,
              name: 'Samsung',
              image: {
                id: 1,
                imageUrl: 'https://example.com/brands/samsung.png',
              },
            },
            {
              id: 2,
              name: 'Apple',
              image: {
                id: 2,
                imageUrl: 'https://example.com/brands/apple.png',
              },
            },
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

  @Post('create')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Create a new brand (Admin/Sales only)' })
  @ApiBody({
    description: 'Brand creation payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'OnePlus' },
        imageUrl: {
          type: 'string',
          example: 'https://example.com/brands/oneplus.png',
        },
      },
      required: ['name', 'imageUrl'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Brand created successfully',
    content: {
      'application/json': {
        example: {
          status: 201,
          message: 'Brand created successfully',
          data: { brandId: 3 },
        },
      },
    },
  })
  async createBrand(
    @Body() brandCreateDto: BrandCreateDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.CREATE_BRAND,
        brandCreateDto,
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
          HttpStatus.CREATED,
          'Brand created successfully',
          { brandId: result },
        );
        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Creating brand failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('update/:brandId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Update a brand (Admin/Sales only)' })
  @ApiParam({
    name: 'brandId',
    type: Number,
    description: 'Brand ID',
    example: 2,
  })
  @ApiBody({
    description: 'Brand update payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Apple Inc.' },
        imageUrl: {
          type: 'string',
          example: 'https://example.com/brands/apple.png',
        },
      },
      required: [],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Brand updated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Brand updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updateBrand(
    @Param('brandId') brandId: number,
    @Body() body: { name?: string; imageUrl?: string },
    @Res() res: Response,
  ) {
    try {
      const { name, imageUrl } = body;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.UPDATE_BRAND,
          { id: brandId, name, imageUrl },
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
          'Brand updated successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Updating brand failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('delete/:brandId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Soft delete a brand (Admin/Sales only)' })
  @ApiParam({
    name: 'brandId',
    type: Number,
    description: 'Brand ID',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Brand deleted successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Brand deleted successfully',
          data: { success: true },
        },
      },
    },
  })
  async deleteBrand(@Param('brandId') brandId: number, @Res() res: Response) {
    try {
      const id: number = brandId;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.DELETE_BRAND,
          id,
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
          'Brand deleted successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Deleting brand failed';

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

  @Post('create')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Create a new category (Admin/Sales only)' })
  @ApiBody({
    description: 'Category creation payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'vivo' },
        parentId: { type: 'number', nullable: true, example: null },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    content: {
      'application/json': {
        example: {
          status: 201,
          message: 'Category created successfully',
          data: { categoryId: 10 },
        },
      },
    },
  })
  async createCategory(
    @Body() categoryCreateDto: CategoryCreateDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.phoneServiceClient,
        PHONE_SERVICE_NAME,
        PHONE_PATTERN.CREATE_CATEGORY,
        categoryCreateDto,
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
          HttpStatus.CREATED,
          'Category created successfully',
          { categoryId: result },
        );
        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Creating category failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('update/:categoryId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Update a category (Admin/Sales only)' })
  @ApiParam({
    name: 'categoryId',
    type: Number,
    description: 'Category ID',
    example: 2,
  })
  @ApiBody({
    description: 'Category update payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'vivo' },
        parentId: { type: 'number', nullable: true, example: null },
      },
      required: [],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Category updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updateCategory(
    @Param('categoryId') categoryId: number,
    @Body() body: CategoryUpdateDto,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.UPDATE_CATEGORY,
          { id: categoryId, data: body },
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
          'Category updated successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Updating category failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('delete/:categoryId')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.SALES)
  @ApiOperation({ summary: 'Soft delete a category (Admin/Sales only)' })
  @ApiParam({
    name: 'categoryId',
    type: Number,
    description: 'Category ID',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Category deleted successfully',
          data: { success: true },
        },
      },
    },
  })
  async deleteCategory(
    @Param('categoryId') categoryId: number,
    @Res() res: Response,
  ) {
    try {
      const id: number = categoryId;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.phoneServiceClient,
          PHONE_SERVICE_NAME,
          PHONE_PATTERN.DELETE_CATEGORY,
          id,
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
          'Category deleted successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Deleting category failed';

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
