import { Injectable, Logger } from '@nestjs/common';
import { ITokenProvider, TokenPayload, TokenResponse } from '../interface';
import { ConfigService } from '@nestjs/config/dist/config.service';
import jwt, { SignOptions } from 'jsonwebtoken';

@Injectable()
export class JwtTokenService implements ITokenProvider {
    private readonly logger = new Logger(JwtTokenService.name);
    private readonly accessTokenSecret: string;
    private readonly refreshTokenSecret: string;
    private readonly accessTokenExpiration: string;
    private readonly refreshTokenExpiration: string;

    constructor(private readonly configService: ConfigService) {
        this.accessTokenSecret = this.configService.get<string>('JWT_ACCESS_SECRET', 'access_secret_key');
        this.refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_secret_key');
        this.accessTokenExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '1h');
        this.refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    }

    async generateTokens(payload: TokenPayload): Promise<TokenResponse> {
        try {
            const currentTime = Math.floor(Date.now() / 1000);

            const tokenPayload = {
                ...payload,
                iat: currentTime,
            };

            const accessToken = jwt.sign(
                tokenPayload,
                this.accessTokenSecret,
                { expiresIn: this.accessTokenExpiration } as SignOptions
            );

            const refreshToken = jwt.sign(
                tokenPayload,
                this.refreshTokenSecret,
                { expiresIn: this.refreshTokenExpiration } as SignOptions
            );

            const decodedAccessToken = jwt.decode(accessToken) as { exp: number };
            const expiresIn = decodedAccessToken.exp - currentTime;

            return {
                accessToken,
                refreshToken,
                expiresIn,
            };
        } catch (error) {
            this.logger.error('Error generating tokens', error);
            throw error;
        }
    }

    async generateAccessToken(payload: TokenPayload): Promise<string> {
        try {
            return jwt.sign(
                {  ...payload, iat: Math.floor(Date.now() / 1000) },
                this.accessTokenSecret,
                { expiresIn: this.accessTokenExpiration } as SignOptions
            );
        } catch (error) {
            this.logger.error('Error generating access token', error);
            throw error;
        }
    }

    async verifyAccessToken(token: string): Promise<TokenPayload | null> {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret) as unknown;
            if (this.isTokenPayload(decoded)) {
                return decoded;
            }

            this.logger.warn('Decoded access token does not match TokenPayload structure');
            return null;
        } catch (error) {
            this.logger.error('Error verifying access token', error);
            throw error;
        }
    }

    async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret) as unknown;
            if (this.isTokenPayload(decoded)) {
                return decoded;
            }
            this.logger.warn('Decoded refresh token does not match TokenPayload structure');
            return null;
        } catch (error) {
            this.logger.error('Error verifying refresh token', error);
            throw error;
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
        try {
            const payload = await this.verifyRefreshToken(refreshToken);

            if (!payload) {
                this.logger.warn('Refresh token payload is null');
                throw new Error('Invalid refresh token');
            }

            const currentTime = Math.floor(Date.now() / 1000);
            const accessToken = await this.generateAccessToken({
                sub: payload.sub,
                username: payload.username,
                email: payload.email,
                role: payload.role,
                iat: currentTime,
            });

            const decodedAccessToken = jwt.decode(accessToken) as { exp: number };
            const expiresIn = decodedAccessToken.exp - currentTime;

            return {
                accessToken,
                expiresIn,
            };
        } catch (error) {
            this.logger.error('Error refreshing access token', error);
            throw error;
        }
    }

    async decodeToken(token: string): Promise<TokenPayload | null> {
        try {
            const decoded = jwt.decode(token) as unknown;
            if (this.isTokenPayload(decoded)) {
                return decoded;
            }

            this.logger.warn('Decoded token does not match TokenPayload structure');
            return null;
        } catch (error) {
            this.logger.error('Error decoding token', error);
            throw error;
        }
    }

    private isTokenPayload(payload: unknown): payload is TokenPayload {
        if (typeof payload !== 'object' || payload === null) {
            return false;
        }
        
        const p = payload as Partial<TokenPayload>;
        
        return (
            typeof p.sub === 'number' &&
            typeof p.username === 'string' &&
            typeof p.role === 'string'
        );
    }
}