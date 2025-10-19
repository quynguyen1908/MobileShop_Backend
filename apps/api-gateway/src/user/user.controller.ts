import { USER_SERVICE } from '@app/contracts';
import type { ReqWithRequester } from '@app/contracts';
import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import type { Response } from 'express';
import {
  Commune,
  CustomerDto,
  Province,
  USER_PATTERN,
  USER_SERVICE_NAME,
} from '@app/contracts/user';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { isFallbackResponse } from '../utils/fallback';
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';
import { RemoteAuthGuard } from '@app/contracts/auth/auth.guard';

@ApiTags('Customers')
@Controller('v1/customers')
export class CustomerController {
  constructor(
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

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
            user: {
              id: 2,
              username: 'johndoe',
              email: 'johndoe@example.com',
              phone: '0123456789',
            },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
