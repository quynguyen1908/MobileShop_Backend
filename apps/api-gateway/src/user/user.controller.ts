import { pagingDtoSchema, USER_SERVICE } from '@app/contracts';
import type { Paginated, PagingDto, ReqWithRequester } from '@app/contracts';
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
  Req,
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
import {
  Commune,
  CustomerDto,
  Notification,
  Province,
  USER_PATTERN,
  USER_SERVICE_NAME,
} from '@app/contracts/user';
import type {
  Address,
  AddressCreateDto,
  CustomerUpdateProfileDto,
} from '@app/contracts/user';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { isFallbackResponse } from '../utils/fallback';
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';
import { RemoteAuthGuard } from '@app/contracts/auth/auth.guard';
import { Roles, RoleType } from '@app/contracts/auth/roles.decorator';

@ApiTags('Customers')
@Controller('v1/customers')
export class CustomerController {
  constructor(
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('list')
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'List customers (Admin only)' })
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
    description: 'Customers retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Customers retrieved successfully',
          data: {
            data: [
              {
                id: 1,
                firstName: 'Jane',
                lastName: 'Doe',
                gender: 'male',
                dateOfBirth: '1990-05-15T00:00:00.000Z',
                pointBalance: 150000,
                user: {
                  id: 1,
                  username: 'janedoe',
                  email: 'janedoe@example.com',
                  phone: '0987654321',
                  status: 'active',
                  lastChangePass: '2024-06-01T00:00:00.000Z',
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
  async listCustomers(@Query() pagingDto: PagingDto, @Res() res: Response) {
    try {
      const paging = pagingDtoSchema.parse(pagingDto);
      const result = await this.circuitBreakerService.sendRequest<
        Paginated<CustomerDto> | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.LIST_CUSTOMERS,
        paging,
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Customers retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Listing customers failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('/me')
  @ApiOperation({
    summary: 'Get current customer info (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Customer retrieved successfully',
          data: {
            id: 2,
            firstName: 'John',
            lastName: 'Doe',
            gender: 'male',
            dateOfBirth: '2000-01-01T00:00:00.000Z',
            pointBalance: 0,
            pointHistory: [],
            user: {
              id: 2,
              username: 'johndoe',
              email: 'johndoe@example.com',
              phone: '0123456789',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            isDeleted: false,
          },
        },
      },
    },
  })
  @UseGuards(RemoteAuthGuard)
  async getCustomerByUserId(
    @Req() req: ReqWithRequester,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        CustomerDto | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.GET_CUSTOMER_BY_USER_ID,
        requester,
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Customer retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting customer failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('/me')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Update current customer profile (requires authentication)',
  })
  @ApiBody({
    description: 'Customer profile update data',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'newusername' },
        gender: { type: 'string', example: 'female' },
      },
      required: [],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Customer profile updated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Customer profile updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updateCustomerProfile(
    @Req() req: ReqWithRequester,
    @Body() data: CustomerUpdateProfileDto,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.userServiceClient,
          USER_SERVICE_NAME,
          USER_PATTERN.UPDATE_CUSTOMER_PROFILE,
          { requester, data },
          () => {
            return {
              fallback: true,
              message: 'User service is temporary unavailable',
            } as FallbackResponse;
          },
          { timeout: 10000 },
        );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Customer profile updated successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Updating customer profile failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('/addresses')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Get current customer addresses (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer addresses retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Customer addresses retrieved successfully',
          data: [
            {
              id: 1,
              customerId: 2,
              recipientName: 'John Doe',
              recipientPhone: '0123456789',
              street: '123 Main St',
              communeId: 12345,
              provinceId: 28,
              postalCode: '700000',
              isDefault: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              isDeleted: false,
            },
          ],
        },
      },
    },
  })
  async getCustomerAddresses(
    @Req() req: ReqWithRequester,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        Address[] | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.GET_CUSTOMER_ADDRESSES,
        requester,
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Customer addresses retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting customer addresses failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('/addresses')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Add a new address to current customer (requires authentication)',
  })
  @ApiBody({
    description: 'Address creation data',
    schema: {
      type: 'object',
      properties: {
        recipientName: { type: 'string', example: 'John Doe' },
        recipientPhone: { type: 'string', example: '0123456789' },
        street: { type: 'string', example: '123 Main St' },
        communeId: { type: 'number', example: 12345 },
        provinceId: { type: 'number', example: 28 },
        postalCode: { type: 'string', example: '700000' },
        isDefault: { type: 'boolean', example: true },
      },
      required: [
        'recipientName',
        'recipientPhone',
        'street',
        'communeId',
        'provinceId',
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Customer address added successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Customer address added successfully',
          data: { addressId: 1 },
        },
      },
    },
  })
  async addCustomerAddress(
    @Req() req: ReqWithRequester,
    @Body() data: AddressCreateDto,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.ADD_CUSTOMER_ADDRESS,
        { requester, data },
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Customer address added successfully',
          { addressId: result },
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Adding customer address failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('/addresses/update/:addressId')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary:
      'Update an address of the current customer (requires authentication)',
  })
  @ApiParam({
    name: 'addressId',
    type: Number,
    description: 'ID of the address to update',
    example: 1,
  })
  @ApiBody({
    description: 'Address update data',
    schema: {
      type: 'object',
      properties: {
        recipientName: { type: 'string', example: 'Jane Doe' },
        recipientPhone: { type: 'string', example: '0987654321' },
        street: { type: 'string', example: '456 Elm St' },
        communeId: { type: 'number', example: 54321 },
        provinceId: { type: 'number', example: 29 },
        postalCode: { type: 'string', example: '800000' },
        isDefault: { type: 'boolean', example: false },
      },
      required: [
        'recipientName',
        'recipientPhone',
        'street',
        'communeId',
        'provinceId',
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Customer address updated successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Customer address updated successfully',
          data: { success: true },
        },
      },
    },
  })
  async updateCustomerAddress(
    @Param('addressId') addressId: number,
    @Req() req: ReqWithRequester,
    @Body() data: AddressCreateDto,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.userServiceClient,
          USER_SERVICE_NAME,
          USER_PATTERN.UPDATE_CUSTOMER_ADDRESS,
          { requester, addressId, data },
          () => {
            return {
              fallback: true,
              message: 'User service is temporary unavailable',
            } as FallbackResponse;
          },
          { timeout: 10000 },
        );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Customer address updated successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Updating customer address failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Put('/addresses/delete/:addressId')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary:
      'Soft delete an address of the current customer (requires authentication)',
  })
  @ApiParam({
    name: 'addressId',
    type: Number,
    description: 'ID of the address to update',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Customer address deleted successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Customer address deleted successfully',
          data: { success: true },
        },
      },
    },
  })
  async softDeleteCustomerAddress(
    @Param('addressId') addressId: number,
    @Req() req: ReqWithRequester,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.userServiceClient,
          USER_SERVICE_NAME,
          USER_PATTERN.DELETE_CUSTOMER_ADDRESS,
          { requester, addressId },
          () => {
            return {
              fallback: true,
              message: 'User service is temporary unavailable',
            } as FallbackResponse;
          },
          { timeout: 10000 },
        );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Customer address deleted successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Deleting customer address failed';

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

@ApiTags('Locations')
@Controller('v1/locations')
export class LocationController {
  constructor(
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('/provinces')
  @ApiOperation({ summary: 'Get all provinces' })
  @ApiResponse({
    status: 200,
    description: 'Provinces retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Provinces retrieved successfully',
          data: [
            {
              id: 28,
              code: 79,
              name: 'Thành Phố Hồ Chí Minh',
              divisionType: 'thành phố trung ương',
              codename: 'ho_chi_minh',
              phoneCode: 28,
            },
          ],
        },
      },
    },
  })
  async getAllProvinces(@Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        Province[] | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.GET_ALL_PROVINCES,
        {},
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Provinces retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting provinces failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('/communes/:provinceCode')
  @ApiOperation({ summary: 'Get communes by province code' })
  @ApiParam({
    name: 'provinceCode',
    type: Number,
    description: 'Province code',
    example: 79,
  })
  @ApiResponse({
    status: 200,
    description: 'Communes retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Communes retrieved successfully',
          data: [
            {
              id: 2563,
              code: 26506,
              name: 'Phường Vũng Tàu',
              divisionType: 'phường',
              codename: 'phuong_vung_tau',
              provinceCode: 79,
            },
          ],
        },
      },
    },
  })
  async getCommunesByProvinceCode(
    @Param('provinceCode') provinceCode: number,
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        Commune[] | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.GET_COMMUNES_BY_PROVINCE_CODE,
        provinceCode,
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Communes retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Getting communes failed';

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

@ApiTags('Notifications')
@Controller('v1/notifications')
export class NotificationController {
  constructor(
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get()
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Get current user notifications (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Notifications retrieved successfully',
          data: [
            {
              id: 2,
              userId: 1,
              title: 'Đơn hàng #PH1211259266 đã được tạo!',
              message: 'Vui lòng kiểm tra và xử lý đơn hàng kịp thời.',
              type: 'admin',
              isRead: false,
              createdAt: '2024-10-05T08:30:00.000Z',
              updatedAt: '2024-10-05T08:30:00.000Z',
              isDeleted: false,
            },
          ],
        },
      },
    },
  })
  async getNotifications(
    @Req() req: ReqWithRequester,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        Notification[] | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.GET_NOTIFICATIONS,
        requester,
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Notifications retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting notifications failed';
        
      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('/unread')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Get current user unread notifications (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread notifications retrieved successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Unread notifications retrieved successfully',
          data: [
            {
              id: 2,
              userId: 1,
              title: 'Đơn hàng #PH1211259266 đã được tạo!',
              message: 'Vui lòng kiểm tra và xử lý đơn hàng kịp thời.',
              type: 'admin',
              isRead: false,
              createdAt: '2024-10-05T08:30:00.000Z',
              updatedAt: '2024-10-05T08:30:00.000Z',
              isDeleted: false,
            },
          ],
        },
      },
    },
  })
  async getUnreadNotifications(
    @Req() req: ReqWithRequester,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        Notification[] | FallbackResponse
      >(
        this.userServiceClient,
        USER_SERVICE_NAME,
        USER_PATTERN.GET_UNREAD_NOTIFICATIONS,
        requester,
        () => {
          return {
            fallback: true,
            message: 'User service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Unread notifications retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting unread notifications failed';
        
      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('/read')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Mark notifications as read (requires authentication)',
  })
  @ApiBody({
    description: 'Notification IDs to mark as read',
    schema: {
      type: 'object',
      properties: {
        notificationIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
        },
      },
      required: ['notificationIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Notifications marked as read successfully',
          data: { success: true },
        },
      },
    },
  })
  async readNotifications(
    @Req() req: ReqWithRequester,
    @Body() body: { notificationIds: number[] },
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const { notificationIds } = body;
      const result =
        await this.circuitBreakerService.sendRequest<void | FallbackResponse>(
          this.userServiceClient,
          USER_SERVICE_NAME,
          USER_PATTERN.READ_NOTIFICATIONS,
          { requester, notificationIds },
          () => {
            return {
              fallback: true,
              message: 'User service is temporary unavailable',
            } as FallbackResponse;
          },
          { timeout: 10000 },
        );

      console.log('User service response:', JSON.stringify(result, null, 2));

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
          'Notifications marked as read successfully',
          { success: true },
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Marking notifications as read failed';

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
