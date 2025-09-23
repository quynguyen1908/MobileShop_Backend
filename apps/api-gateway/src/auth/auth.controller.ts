import { AUTH_SERVICE } from '@app/contracts';
import { AUTH_PATTERN, type RegisterDto } from '@app/contracts/auth';
import { Body, Controller, HttpStatus, Inject, Post, Res } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import type { Response } from 'express';  
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';

@ApiTags('Authentication')
@Controller('auth')
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
}
