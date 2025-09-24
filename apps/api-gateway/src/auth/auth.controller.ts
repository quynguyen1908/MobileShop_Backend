import { AUTH_SERVICE } from '@app/contracts';
import type { ReqWithRequester } from '@app/contracts';
import { AUTH_PATTERN } from '@app/contracts/auth';
import type { LoginDto, RegisterDto } from '@app/contracts/auth';
import { Body, Controller, Get, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import type { Response } from 'express';  
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';
import { AuthGuard } from '@app/contracts/auth/auth.guard';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
    constructor(
        @Inject(AUTH_SERVICE) private readonly authServiceClient: ClientProxy,
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
            required: ['username', 'email', 'password', 'phone', 'roleId', 'firstName', 'lastName', 'dateOfBirth']
        }
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
                            expiresIn: 3600
                        },
                    },
                    errors: null
                }
            }
        }
    })
    async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
        try {
            const result = await firstValueFrom(
                this.authServiceClient.send(AUTH_PATTERN.REGISTER, registerDto),
            );

            console.log('Auth Service response:', JSON.stringify(result, null, 2));

            const response = new ApiResponseDto(
                HttpStatus.CREATED,
                'User registered successfully',
                {
                    userId: result.userId,
                    tokens: result.tokens,
                }
            );

            return res.status(HttpStatus.CREATED).json(response);
        } catch (error) {
            const errorResponse = new ApiResponseDto(
                error.status || HttpStatus.BAD_REQUEST,
                error.message || 'Registration failed',
                null,
                formatError(error)
            );
            return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
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
            required: ['username', 'password']
        }
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
                            expiresIn: 3600
                        },
                    },
                    errors: null
                }
            }
        }
    })
    async login(@Body() loginDto: LoginDto, @Res() res: Response) {
        try {
            const result = await firstValueFrom(
                this.authServiceClient.send(AUTH_PATTERN.LOGIN, loginDto),
            );

            console.log('Auth Service response:', JSON.stringify(result, null, 2));

            const response = new ApiResponseDto(
                HttpStatus.OK,
                'User logged in successfully',
                {
                    userId: result.userId,
                    tokens: result.tokens,
                }
            );

            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const statusCode = error.status || (error.message?.includes('credentials') ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST);
            const errorResponse = new ApiResponseDto(
                statusCode,
                error.message || 'Login failed',
                null,
                formatError(error)
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
                    errors: null
                }
            }
        }
    })
    @UseGuards(AuthGuard)
    async logout(@Req() req: ReqWithRequester, @Res() res: Response) {
        try {
            const requester = req.requester;
            const result = await firstValueFrom(
                this.authServiceClient.send(AUTH_PATTERN.LOGOUT, requester),
            );

            console.log('Auth Service logout response:', JSON.stringify(result, null, 2));

            const response = new ApiResponseDto(
                HttpStatus.OK,
                'User logged out successfully',
                result,
                null
            );

            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const errorResponse = new ApiResponseDto(
                error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                error.message || 'Logout failed',
                null,
                formatError(error)
            );
            return res.status(errorResponse.status).json(errorResponse);
        }
    }

    @Get('test')
    async test(@Res() res: Response) {
        try {   
            console.log('Sending test message to Auth Service...');

            const result = await firstValueFrom(
                this.authServiceClient.send(AUTH_PATTERN.TEST, { timestamp: new Date().toISOString() })
            );

            console.log('Auth Service test response:', JSON.stringify(result, null, 2));

            const response = new ApiResponseDto(
                HttpStatus.OK,
                'Test message processed successfully',
                result
            );

            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            console.error('Error during test message:', error);

            const errorResponse = new ApiResponseDto(
                error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                error.message || 'Test message failed',
                null,
                formatError(error)
            );
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
        }
    }
}