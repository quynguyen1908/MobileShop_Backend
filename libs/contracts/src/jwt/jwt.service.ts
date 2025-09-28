import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ITokenProvider,
  ITokenValidator,
  TokenPayload,
  TokenResponse,
  TokenValidationResult,
} from '../interface';
import { ConfigService } from '@nestjs/config/dist/config.service';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { TokenWhitelistRepository } from './jwt.repository';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from '..';
import { AUTH_PATTERN } from '../auth';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

@Injectable()
export class JwtTokenService implements ITokenProvider {
  private readonly logger = new Logger(JwtTokenService.name);
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenWhitelist: TokenWhitelistRepository,
  ) {
    this.accessTokenSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'access_secret_key',
    );
    this.refreshTokenSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'refresh_secret_key',
    );
    this.accessTokenExpiration = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '1h',
    );
    this.refreshTokenExpiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
  }

  async generateTokens(payload: TokenPayload): Promise<TokenResponse> {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenId: string = uuidv4();

      const tokenPayload = {
        ...payload,
        iat: currentTime,
        jti: tokenId,
      };

      const accessToken = jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiration,
      } as SignOptions);

      const refreshToken = jwt.sign(tokenPayload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiration,
      } as SignOptions);

      const decodedAccessToken = jwt.decode(accessToken) as { exp: number };
      const expiresIn = decodedAccessToken.exp - currentTime;

      const refreshExpiration = new Date();
      const refreshExpirationMs =
        this.parseExpiration(this.refreshTokenExpiration) * 1000;
      refreshExpiration.setTime(
        refreshExpiration.getTime() + refreshExpirationMs,
      );

      await this.tokenWhitelist.addToWhitelist(
        payload.sub,
        tokenId,
        refreshToken,
        refreshExpiration,
      );

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error: unknown) {
      let errMsg: string;
      if (error instanceof Error) {
        errMsg = error.message;
        this.logger.error('Error generating tokens', error);
        throw error;
      } else {
        errMsg = typeof error === 'string' ? error : JSON.stringify(error);
        this.logger.error('Error generating tokens', errMsg);
        throw new Error(errMsg);
      }
    }
  }

  generateAccessToken(payload: TokenPayload): string {
    try {
      return jwt.sign(
        { ...payload, iat: Math.floor(Date.now() / 1000) },
        this.accessTokenSecret,
        { expiresIn: this.accessTokenExpiration } as SignOptions,
      );
    } catch (error: unknown) {
      let errMsg: string;
      if (error instanceof Error) {
        errMsg = error.message;
        this.logger.error('Error generating access token', error);
        throw error;
      } else {
        errMsg = typeof error === 'string' ? error : JSON.stringify(error);
        this.logger.error('Error generating access token', errMsg);
        throw new Error(errMsg);
      }
    }
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as unknown;
      if (this.isTokenPayload(decoded)) {
        return decoded;
      }

      this.logger.warn(
        'Decoded access token does not match TokenPayload structure',
      );
      return null;
    } catch (error: unknown) {
      let errMsg: string;
      if (error instanceof Error) {
        errMsg = error.message;
        this.logger.error('Error verifying access token', error);
        throw error;
      } else {
        errMsg = typeof error === 'string' ? error : JSON.stringify(error);
        this.logger.error('Error verifying access token', errMsg);
        throw new Error(errMsg);
      }
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as unknown;
      if (!this.isTokenPayload(decoded) || !decoded.jti) {
        this.logger.warn(
          'Decoded refresh token does not match TokenPayload structure or missing jti',
        );
        return null;
      }

      const isWhitelisted = await this.tokenWhitelist.isWhitelisted(
        decoded.sub,
        decoded.jti,
      );
      if (!isWhitelisted) {
        this.logger.warn(
          `Refresh token with jti ${decoded.jti} for user ${decoded.sub} not whitelisted`,
        );
        return null;
      }

      return decoded;
    } catch (error: unknown) {
      let errMsg: string;
      if (error instanceof Error) {
        errMsg = error.message;
        this.logger.error('Error verifying refresh token', error);
        throw error;
      } else {
        errMsg = typeof error === 'string' ? error : JSON.stringify(error);
        this.logger.error('Error verifying refresh token', errMsg);
        throw new Error(errMsg);
      }
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);

      if (!payload || !payload.jti) {
        this.logger.warn('Refresh token payload is null or missing jti');
        throw new UnauthorizedException('Invalid refresh token');
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const newTokenId: string = uuidv4();
      const accessToken = this.generateAccessToken({
        sub: payload.sub,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        iat: currentTime,
        jti: newTokenId,
      });

      await this.tokenWhitelist.removeFromWhitelist(payload.sub, payload.jti);

      const newRefreshToken = jwt.sign(
        {
          sub: payload.sub,
          username: payload.username,
          email: payload.email,
          role: payload.role,
          iat: currentTime,
          jti: newTokenId,
        },
        this.refreshTokenSecret,
        { expiresIn: this.refreshTokenExpiration } as SignOptions,
      );

      const refreshExpiration = new Date();
      const refreshExpirationMs =
        this.parseExpiration(this.refreshTokenExpiration) * 1000;
      refreshExpiration.setTime(
        refreshExpiration.getTime() + refreshExpirationMs,
      );

      await this.tokenWhitelist.addToWhitelist(
        payload.sub,
        newTokenId,
        newRefreshToken,
        refreshExpiration,
      );

      const decodedAccessToken = jwt.decode(accessToken) as { exp: number };
      const expiresIn = decodedAccessToken.exp - currentTime;

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      };
    } catch (error: unknown) {
      let errMsg: string;
      if (error instanceof Error) {
        errMsg = error.message;
        this.logger.error('Error refreshing access token', error);
        throw error;
      } else {
        errMsg = typeof error === 'string' ? error : JSON.stringify(error);
        this.logger.error('Error refreshing access token', errMsg);
        throw new Error(errMsg);
      }
    }
  }

  async invalidateToken(userId: number, tokenId?: string): Promise<void> {
    try {
      this.logger.log(
        `Invalidating token for user ${userId}, tokenId: ${tokenId || 'all tokens'}`,
      );
      if (tokenId) {
        await this.tokenWhitelist.removeFromWhitelist(userId, tokenId);
      } else {
        await this.tokenWhitelist.removeAllUserTokens(userId);
      }
    } catch (error: unknown) {
      let errMsg: string;
      if (error instanceof Error) {
        errMsg = error.message;
        this.logger.error('Error invalidating token', error);
        throw error;
      } else {
        errMsg = typeof error === 'string' ? error : JSON.stringify(error);
        this.logger.error('Error invalidating token', errMsg);
        throw new Error(errMsg);
      }
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as unknown;
      if (this.isTokenPayload(decoded)) {
        return decoded;
      }

      this.logger.warn('Decoded token does not match TokenPayload structure');
      return null;
    } catch (error: unknown) {
      let errMsg: string;
      if (error instanceof Error) {
        errMsg = error.message;
        this.logger.error('Error decoding token', error);
        throw error;
      } else {
        errMsg = typeof error === 'string' ? error : JSON.stringify(error);
        this.logger.error('Error decoding token', errMsg);
        throw new Error(errMsg);
      }
    }
  }

  private isTokenPayload(
    payload: unknown,
  ): payload is TokenPayload & { jti: string } {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const p = payload as Partial<TokenPayload> & { jti?: string };

    return (
      typeof p.sub === 'number' &&
      typeof p.username === 'string' &&
      typeof p.role === 'string' &&
      typeof p.jti === 'string'
    );
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}

@Injectable()
export class TokenValidator implements ITokenValidator {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authServiceClient: ClientProxy,
  ) {}

  async validate(token: string): Promise<TokenValidationResult> {
    try {
      const data = await firstValueFrom<TokenPayload>(
        this.authServiceClient.send(AUTH_PATTERN.VALIDATE_TOKEN, token),
      );
      return { payload: data, isValid: true };
    } catch (error) {
      const typedError =
        error instanceof Error ? error : new Error(String(error));

      return {
        payload: null,
        error: typedError,
        isValid: false,
      };
    }
  }
}
