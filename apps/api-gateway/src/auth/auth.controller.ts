import { AUTH_SERVICE } from '@app/contracts';
import type { ReqWithRequester } from '@app/contracts';
import { AUTH_PATTERN, AUTH_SERVICE_NAME } from '@app/contracts/auth';
import type { LoginDto, RegisterDto } from '@app/contracts/auth';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiResponseDto } from '../dto/response.dto';
import type { ServiceError, FallbackResponse } from '../dto/error.dto';
import { formatError } from '../utils/error';
import { isFallbackResponse } from '../utils/fallback';
import { AuthGuard } from '@app/contracts/auth';
import * as AuthInterface from './auth.interface';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    description: 'User registration data',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'max' },
        email: { type: 'string', example: 'max@example.com' },
        password: { type: 'string', example: 'strongPassword123' },
        phone: { type: 'string', example: '0987654321' },
        roleId: { type: 'number', example: 1 },
        firstName: { type: 'string', example: 'Max' },
        lastName: { type: 'string', example: 'Johnson' },
        dateOfBirth: { type: 'string', format: 'date', example: '1992-05-15' },
      },
      required: [
        'username',
        'email',
        'password',
        'phone',
        'roleId',
        'firstName',
        'lastName',
        'dateOfBirth',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully registered.',
    content: {
      'application/json': {
        example: {
          status: 201,
          message: 'User registered successfully',
          data: {
            userId: 1,
            tokens: {
              accessToken: 'someAccessToken',
              refreshToken: 'someRefreshToken',
              expiresIn: 3600,
            },
          },
          errors: null,
        },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        AuthInterface.LoginResponse | FallbackResponse
      >(
        this.authServiceClient,
        AUTH_SERVICE_NAME,
        AUTH_PATTERN.REGISTER,
        registerDto,
        () => {
          return {
            fallback: true,
            message: 'Auth service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 5000 },
      );

      console.log('Auth Service response:', JSON.stringify(result, null, 2));

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
          'User registered successfully',
          {
            userId: result.userId,
            tokens: result.tokens,
          },
        );

        return res.status(HttpStatus.CREATED).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.status || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.message || 'Registration failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with credentials' })
  @ApiBody({
    description: 'User login credentials',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'max' },
        password: { type: 'string', example: 'strongPassword123' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Úser logged in successfully.',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'User logged in successfully',
          data: {
            userId: 1,
            tokens: {
              accessToken: 'someAccessToken',
              refreshToken: 'someRefreshToken',
              expiresIn: 3600,
            },
          },
          errors: null,
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        AuthInterface.LoginResponse | FallbackResponse
      >(
        this.authServiceClient,
        AUTH_SERVICE_NAME,
        AUTH_PATTERN.LOGIN,
        loginDto,
        () => {
          return {
            fallback: true,
            message: 'Auth service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 5000 },
      );

      console.log('Auth Service response:', JSON.stringify(result, null, 2));

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
          'User logged in successfully',
          {
            userId: result.userId,
            tokens: result.tokens,
          },
        );

        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;

      let statusCode = HttpStatus.BAD_REQUEST;
      if (typedError.status) {
        statusCode = typedError.status;
      } else if (
        typedError.message &&
        typedError.message.includes('credentials')
      ) {
        statusCode = HttpStatus.UNAUTHORIZED;
      }

      const errorMessage = typedError.message || 'Login failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );

      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout the current user' })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'User logged out successfully',
          data: true,
          errors: null,
        },
      },
    },
  })
  @UseGuards(AuthGuard)
  async logout(@Req() req: ReqWithRequester, @Res() res: Response) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        AuthInterface.LogoutResponse | FallbackResponse
      >(
        this.authServiceClient,
        AUTH_SERVICE_NAME,
        AUTH_PATTERN.LOGOUT,
        requester,
        () => {
          return {
            fallback: true,
            message: 'Auth service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 5000 },
      );

      console.log('Auth Service response:', JSON.stringify(result, null, 2));

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
          'User logged out successfully',
          result,
          null,
        );

        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = typedError.message || 'Logout failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('test')
  async test(@Res() res: Response) {
    try {
      console.log('Sending test message to Auth Service...');

      // const result = await firstValueFrom<AuthInterface.TestResponse>(
      //   this.authServiceClient.send(AUTH_PATTERN.TEST, {
      //     timestamp: new Date().toISOString(),
      //   }),
      // );

      // console.log(
      //   'Auth Service test response:',
      //   JSON.stringify(result, null, 2),
      // );

      // const response = new ApiResponseDto(
      //   HttpStatus.OK,
      //   'Test message processed successfully',
      //   result,
      // );

      // return res.status(HttpStatus.OK).json(response);

      const result = await this.circuitBreakerService.sendRequest<
        AuthInterface.TestResponse | FallbackResponse
      >(
        this.authServiceClient,
        AUTH_SERVICE_NAME,
        AUTH_PATTERN.TEST,
        { timestamp: new Date().toISOString() },
        () => {
          return {
            fallback: true,
            message: 'Auth service is temporarily unavailable',
          } as FallbackResponse;
        },
        { timeout: 5000 },
      );

      console.log('Auth Service response:', JSON.stringify(result, null, 2));

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
          'Test message processed successfully',
          result,
        );

        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      console.error('Error during test message:', error);

      const typedError = error as ServiceError;
      const statusCode = typedError.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = typedError.message || 'Test message failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
}
