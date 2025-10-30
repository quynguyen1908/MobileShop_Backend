import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  IAuthRepository,
  IAuthService,
  IOAuthRepository,
  IRoleQueryRepository,
} from './auth.port';
import type {
  IEventPublisher,
  ITokenProvider,
  Requester,
  TokenPayload,
  TokenResponse,
} from '@app/contracts/interface';
import * as bcrypt from 'bcrypt';
import {
  AppError,
  EVENT_PUBLISHER,
  Paginated,
  PagingDto,
  TOKEN_PROVIDER,
  ROLE_REPOSITORY,
  AUTH_REPOSITORY,
  OAUTH_REPOSITORY,
} from '@app/contracts';
import {
  ErrUsernameAlreadyExists,
  ErrEmailAlreadyExists,
  ErrUserNotFound,
  RegisterDto,
  User,
  UserCreateDto,
  UserFilterDto,
  userFilterDtoSchema,
  userSchema,
  UserStatus,
  UserUpdateDto,
  AuthRegisteredEvent,
  ErrPhoneAlreadyExists,
  LoginDto,
  ErrInvalidUsernameAndPassword,
  ErrUserInactivated,
  AuthTestEvent,
  AUTH_SERVICE_NAME,
  OAuthCreateDto,
  ErrOAuthAlreadyExists,
  OAuth,
  GoogleResponseDto,
  OAuthProvider,
} from '@app/contracts/auth';
import { randomInt } from 'crypto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleQueryRepository,
    @Inject(OAUTH_REPOSITORY)
    private readonly oauthRepository: IOAuthRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject(TOKEN_PROVIDER) private readonly tokenProvider: ITokenProvider,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ userId: number; tokens: TokenResponse }> {
    const userCreateDto: UserCreateDto = {
      username: registerDto.username,
      email: registerDto.email,
      password: await this.hashPassword(registerDto.password),
      phone: registerDto.phone,
      roleId: registerDto.roleId || 1,
    };

    const userId = await this.create(userCreateDto);

    const role = await this.roleRepository.findById(userCreateDto.roleId);

    const tokens = await this.tokenProvider.generateTokens({
      sub: userId,
      username: registerDto.username,
      email: registerDto.email,
      role: role ? role.name : 'customer',
    });

    const event = AuthRegisteredEvent.create(
      {
        id: userId,
        username: registerDto.username,
        email: registerDto.email,
        phone: registerDto.phone,
        roleId: userCreateDto.roleId,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        dateOfBirth: registerDto.dateOfBirth,
      },
      AUTH_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);

    return {
      userId,
      tokens,
    };
  }

  async login(data: LoginDto): Promise<{ userId: number; tokens: any }> {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.username);
    let user: User | null = null;

    if (isEmail) {
      user = await this.authRepository.findByFilter({ email: data.username });
      if (!user)
        throw new RpcException(
          AppError.from(ErrInvalidUsernameAndPassword, 400)
            .withLog('Email not found')
            .toJson(false),
        );
    } else {
      user = await this.authRepository.findByFilter({
        username: data.username,
      });
      if (!user)
        throw new RpcException(
          AppError.from(ErrInvalidUsernameAndPassword, 400)
            .withLog('Username not found')
            .toJson(false),
        );
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch)
      throw new RpcException(
        AppError.from(ErrInvalidUsernameAndPassword, 400)
          .withLog('Invalid password')
          .toJson(false),
      );

    if (user.status !== UserStatus.ACTIVE)
      throw new RpcException(
        AppError.from(ErrUserInactivated, 400)
          .withLog('User is inactive')
          .toJson(false),
      );

    const role = await this.roleRepository.findById(user.roleId);

    const tokens = await this.tokenProvider.generateTokens({
      sub: user.id!,
      username: user.username,
      email: user.email,
      role: role ? role.name : 'customer',
    });
    return {
      userId: user.id!,
      tokens,
    };
  }

  async logout(requester: Requester): Promise<boolean> {
    await this.tokenProvider.invalidateToken(requester.sub, requester.jti);
    return true;
  }

  async changePassword(
    requester: Requester,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.authRepository.findById(requester.sub);
    if (!user) {
      throw new RpcException(
        AppError.from(ErrUserNotFound, 404)
          .withLog('User not found')
          .toJson(false),
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new RpcException(
        AppError.from(new Error('Current password is incorrect'), 400)
          .withLog('Current password is incorrect')
          .toJson(false),
      );
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new RpcException(
        AppError.from(
          new Error('New password must be different from the current password'),
          400,
        )
          .withLog('New password must be different from the current password')
          .toJson(false),
      );
    }

    await this.authRepository.update(user.id!, {
      password: hashedNewPassword,
      lastChangePass: new Date(),
    });
    return true;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const tokens = await this.tokenProvider.refreshAccessToken(refreshToken);
      return tokens;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw new RpcException(error);
      }
      const typedError =
        error instanceof Error ? error : new Error('Unknown error');

      throw new RpcException(
        AppError.from(new Error('Invalid refresh token'), 401).withLog(
          `Failed to refresh token: ${typedError.message}`,
        ),
      );
    }
  }

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.tokenProvider.verifyAccessToken(token);
      if (!payload) {
        throw new RpcException(
          new UnauthorizedException('Invalid or expired token'),
        );
      }

      const user = await this.authRepository.findById(payload.sub);
      if (!user) {
        throw new RpcException(new UnauthorizedException('User not found'));
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new RpcException(new UnauthorizedException('User is inactive'));
      }

      return payload;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw new RpcException(error);
      }
      const typedError =
        error instanceof Error ? error : new Error('Unknown error');

      throw new RpcException(
        AppError.from(new Error('Invalid token'), 401).withLog(
          `Failed to validate token: ${typedError.message}`,
        ),
      );
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return this.tokenProvider.decodeToken(token);
    } catch (error: unknown) {
      const typedError =
        error instanceof Error ? error : new Error('Unknown error');

      throw new RpcException(
        AppError.from(new Error('Failed to decode token'), 400).withLog(
          `Token decode error: ${typedError.message}`,
        ),
      );
    }
  }

  async loginWithGoogle(
    profile: GoogleResponseDto,
  ): Promise<{ userId: number; tokens: any }> {
    const oauth = await this.oauthRepository.findByProviderAndOAuthId(
      'google',
      profile.googleId,
    );

    let user: User | null = null;

    if (oauth) {
      user = await this.authRepository.findById(oauth.userId);
      if (!user) {
        throw new RpcException(
          AppError.from(ErrUserNotFound, 404)
            .withLog('User not found')
            .toJson(false),
        );
      }
    } else {
      user = await this.authRepository.findByFilter({
        email: profile.email,
      });
      if (!user) {
        throw new RpcException(
          AppError.from(ErrUserNotFound, 404)
            .withLog('User not found')
            .toJson(false),
        );
      }

      const oauthCreateDto: OAuthCreateDto = {
        oauthProvider: OAuthProvider.GOOGLE,
        oauthId: profile.googleId,
        userId: user.id!,
      };

      await this.createOAuth(oauthCreateDto);
    }

    const role = await this.roleRepository.findById(user.roleId);

    const tokens = await this.tokenProvider.generateTokens({
      sub: user.id!,
      username: user.username,
      email: user.email,
      role: role ? role.name : 'customer',
    });

    return {
      userId: user.id!,
      tokens,
    };
  }

  async create(userCreateDto: UserCreateDto): Promise<number> {
    const data = userSchema.parse(userCreateDto);

    const userExists = await this.authRepository.findExistingUser({
      username: data.username,
      email: data.email,
      phone: data.phone,
    });

    if (userExists) {
      if (userExists.username === data.username) {
        throw new RpcException(
          AppError.from(ErrUsernameAlreadyExists, 400)
            .withLog('Username already exists')
            .toJson(false),
        );
      }
      if (userExists.email === data.email) {
        throw new RpcException(
          AppError.from(ErrEmailAlreadyExists, 400)
            .withLog('Email already exists')
            .toJson(false),
        );
      }
      if (userExists.phone === data.phone) {
        throw new RpcException(
          AppError.from(ErrPhoneAlreadyExists, 400)
            .withLog('Phone already exists')
            .toJson(false),
        );
      }
    }

    const user: User = {
      username: userCreateDto.username,
      password: userCreateDto.password,
      phone: userCreateDto.phone,
      email: userCreateDto.email,
      roleId: userCreateDto.roleId,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    };

    const newUser = await this.authRepository.insert(user);

    return newUser.id!;
  }

  async get(id: number): Promise<User> {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw new RpcException(
        AppError.from(ErrUserNotFound, 404)
          .withLog('User not found')
          .toJson(false),
      );
    }
    return user;
  }

  async getByFilter(filter: UserFilterDto): Promise<User | null> {
    const user = await this.authRepository.findByFilter(filter);
    if (!user) {
      return null;
    }
    return user;
  }

  async profile(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw new RpcException(
        AppError.from(ErrUserNotFound, 404)
          .withLog('User not found')
          .toJson(false),
      );
    }
    const { password: _, ...profile } = user;
    return profile;
  }

  async update(id: number, data: UserUpdateDto): Promise<void> {
    const userExists = await this.authRepository.findById(id);
    if (!userExists) {
      throw new RpcException(
        AppError.from(ErrUserNotFound, 404)
          .withLog('User not found')
          .toJson(false),
      );
    }
    await this.authRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const userExists = await this.authRepository.findById(id);
    if (!userExists) {
      throw new RpcException(
        AppError.from(ErrUserNotFound, 404)
          .withLog('User not found')
          .toJson(false),
      );
    }
    await this.authRepository.delete(id);
  }

  async list(
    filter: UserFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<User>> {
    const dto = userFilterDtoSchema.parse(filter);
    return await this.authRepository.list(dto, paging);
  }

  async test(): Promise<void> {
    const event = AuthTestEvent.create(
      {
        id: randomInt(1, 1000),
        message: 'Test message from Auth Service',
        timestamp: new Date().toISOString(),
      },
      AUTH_SERVICE_NAME,
    );

    await this.eventPublisher.publish(event);
  }

  async createOAuth(oauthCreateDto: OAuthCreateDto): Promise<number> {
    const oauthExists = await this.oauthRepository.findByProviderAndOAuthId(
      oauthCreateDto.oauthProvider,
      oauthCreateDto.oauthId,
    );

    if (oauthExists) {
      throw new RpcException(
        AppError.from(ErrOAuthAlreadyExists, 400)
          .withLog('OAuth already exists')
          .toJson(false),
      );
    }

    const oauth: OAuth = {
      userId: oauthCreateDto.userId,
      oauthProvider: oauthCreateDto.oauthProvider,
      oauthId: oauthCreateDto.oauthId,
      isDeleted: false,
    };

    const newOAuth = await this.oauthRepository.insert(oauth);

    return newOAuth.id!;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = 10;
    return bcrypt.hash(password, salt);
  }
}
