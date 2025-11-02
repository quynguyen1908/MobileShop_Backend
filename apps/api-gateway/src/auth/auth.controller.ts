import { AUTH_SERVICE } from '@app/contracts';
import type { ReqWithRequester, TokenResponse } from '@app/contracts';
import { AUTH_PATTERN, AUTH_SERVICE_NAME } from '@app/contracts/auth';
import type {
  GoogleResponseDto,
  LoginDto,
  RegisterDto,
} from '@app/contracts/auth';
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
import { RemoteAuthGuard } from '@app/contracts/auth';
import * as AuthInterface from './auth.interface';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly configService: ConfigService,
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
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Registration failed';

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
    description: 'User logged in successfully.',
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
      if (typedError.statusCode) {
        statusCode = typedError.statusCode;
      } else if (
        typedError.logMessage &&
        typedError.logMessage.includes('credentials')
      ) {
        statusCode = HttpStatus.UNAUTHORIZED;
      }

      const errorMessage = typedError.logMessage || 'Login failed';

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
  @ApiOperation({
    summary: 'Logout the current user (requires authentication)',
  })
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
  @UseGuards(RemoteAuthGuard)
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
      const statusCode =
        typedError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = typedError.logMessage || 'Logout failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password (requires authentication)' })
  @ApiBody({
    description: 'User current and new password',
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string', example: 'strongPassword123' },
        newPassword: { type: 'string', example: 'newStrongPassword123' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully.',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Password changed successfully',
          data: true,
          errors: null,
        },
      },
    },
  })
  @UseGuards(RemoteAuthGuard)
  async changePassword(
    @Req() req: ReqWithRequester,
    @Body() body: { currentPassword: string; newPassword: string },
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const { currentPassword, newPassword } = body;

      const result = await this.circuitBreakerService.sendRequest<
        boolean | FallbackResponse
      >(
        this.authServiceClient,
        AUTH_SERVICE_NAME,
        AUTH_PATTERN.CHANGE_PASSWORD,
        { requester, currentPassword, newPassword },
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
          'Password changed successfully',
          result,
          null,
        );

        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode =
        typedError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = typedError.logMessage || 'Change password failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google OAuth2' })
  async googleLogin() {}

  @Post('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiBody({
    description: 'Google OAuth2 callback',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'authorizationCodeFromGoogle' },
      },
      required: ['code'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User logged in with Google successfully.',
    content: {
      'application/json': {
        examples: {
          success: {
            value: {
              status: 200,
              message: 'User logged in with Google successfully',
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
          notFound: {
            value: {
              status: 404,
              message:
                'User not found in the system. Please register an account.',
              data: {
                googleUser: {
                  id: 'googleId123',
                  email: 'example@gmail.com',
                  firstName: 'John',
                  lastName: 'Doe',
                },
                isNewUser: true,
              },
              errors: null,
            },
          },
        },
      },
    },
  })
  async googleLoginCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const googleUser = req.user as GoogleResponseDto;

      const result = await this.circuitBreakerService.sendRequest<
        AuthInterface.LoginResponse | FallbackResponse
      >(
        this.authServiceClient,
        AUTH_SERVICE_NAME,
        AUTH_PATTERN.GOOGLE_LOGIN,
        googleUser,
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
          'User logged in with Google successfully',
          {
            userId: result.userId,
            tokens: result.tokens,
          },
        );

        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode =
        typedError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;

      if (
        typedError.statusCode === HttpStatus.NOT_FOUND &&
        typedError.logMessage === 'User not found'
      ) {
        const response = new ApiResponseDto(
          HttpStatus.NOT_FOUND,
          'User not found in the system. Please register an account.',
          {
            googleUser: req.user,
            isNewUser: true,
          },
        );

        return res.status(HttpStatus.NOT_FOUND).json(response);
      }

      const errorResponse = new ApiResponseDto(
        statusCode,
        typedError.logMessage || 'Google login failed',
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    description: 'Refresh token data',
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'someRefreshToken' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    content: {
      'application/json': {
        example: {
          status: 200,
          message: 'Token refreshed successfully',
          data: {
            accessToken: 'newAccessToken',
            refreshToken: 'newRefreshToken',
            expiresIn: 3600,
          },
          errors: null,
        },
      },
    },
  })
  async refreshToken(
    @Body() body: { refreshToken: string },
    @Res() res: Response,
  ) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        TokenResponse | FallbackResponse
      >(
        this.authServiceClient,
        AUTH_SERVICE_NAME,
        AUTH_PATTERN.REFRESH_TOKEN,
        body.refreshToken,
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
          'Token refreshed successfully',
          result,
        );

        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      console.error('Error during token refresh:', error);
      const typedError = error as ServiceError;
      const statusCode =
        typedError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = typedError.logMessage || 'Token refresh failed';

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
      const statusCode =
        typedError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = typedError.logMessage || 'Test message failed';

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
