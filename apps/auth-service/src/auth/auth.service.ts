import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IAuthRepository, IAuthService, IRoleQueryRepository } from './auth.port';
import type { IEventPublisher, ITokenProvider, ITokenValidator, Requester, TokenPayload, TokenResponse, TokenValidationResult } from '@app/contracts/interface';
import * as bcrypt from 'bcrypt';
import { AppError, EVENT_PUBLISHER, Paginated, PagingDto, TOKEN_PROVIDER, ROLE_REPOSITORY, AUTH_REPOSITORY } from '@app/contracts';
import { ErrUsernameAlreadyExists, ErrEmailAlreadyExists, ErrUserNotFound, RegisterDto, User, UserCreateDto, UserFilterDto, userFilterDtoSchema, userSchema, UserStatus, UserUpdateDto, AuthRegisteredEvent, ErrPhoneAlreadyExists, LoginDto, ErrInvalidUsernameAndPassword, ErrUserInactivated, AuthTestEvent } from '@app/contracts/auth';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleQueryRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject(TOKEN_PROVIDER) private readonly tokenProvider: ITokenProvider,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ userId: number; tokens: TokenResponse }> {
    try {
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

      const event = AuthRegisteredEvent.create({
        id: userId,
        username: registerDto.username,
        email: registerDto.email,
        phone: registerDto.phone,
        roleId: userCreateDto.roleId,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        dateOfBirth: registerDto.dateOfBirth,
      }, 'auth-service');

      await this.eventPublisher.publish(event);

      return {
        userId,
        tokens,
      };
    } catch (error) {
      throw error;
    }
  }

  async login(data: LoginDto): Promise<{ userId: number; tokens: any; }> {
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.username);
      let user: User | null = null;

      if (isEmail) {
        user = await this.authRepository.findByFilter({ email: data.username });
        if (!user) throw AppError.from(ErrInvalidUsernameAndPassword, 400).withLog("Email not found");
      } else {
        user = await this.authRepository.findByFilter({ username: data.username });
        if (!user) throw AppError.from(ErrInvalidUsernameAndPassword, 400).withLog("Username not found");
      }

      const isMatch = await bcrypt.compare(data.password, user.password);
      if (!isMatch) throw AppError.from(ErrInvalidUsernameAndPassword, 400).withLog("Invalid password");

      if (user.status !== UserStatus.ACTIVE) throw AppError.from(ErrUserInactivated, 400);

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
    } catch (error) {
      throw error;
    }
  }

  async logout(requester: Requester): Promise<boolean> {
    try {
      await this.tokenProvider.invalidateToken(requester.sub, requester.jti);
      return true;
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const tokens = await this.tokenProvider.refreshAccessToken(refreshToken);
      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw AppError.from(new Error('Invalid refresh token'), 401)
        .withLog(`Failed to refresh token: ${error.message}`);
    }
  }

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.tokenProvider.verifyAccessToken(token);
      if (!payload) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const user = await this.authRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('User is inactive');
      }
      
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw AppError.from(new Error('Invalid token'), 401)
        .withLog(`Failed to validate token: ${error.message}`);
    }
  }

  async decodeToken(token: string): Promise<TokenPayload | null> {
    try {
      return await this.tokenProvider.decodeToken(token);
    } catch (error) {
      throw AppError.from(new Error('Failed to decode token'), 400)
        .withLog(`Token decode error: ${error.message}`);
    }
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
        throw AppError.from(ErrUsernameAlreadyExists, 400);
      }
      if (userExists.email === data.email) {
        throw AppError.from(ErrEmailAlreadyExists, 400);
      }
      if (userExists.phone === data.phone) {
        throw AppError.from(ErrPhoneAlreadyExists, 400);
      }
    }

    const user: User = {
      username: userCreateDto.username,
      password: userCreateDto.password,
      phone: userCreateDto.phone,
      email: userCreateDto.email,
      roleId: userCreateDto.roleId,
      status: UserStatus.ACTIVE,
    }

    const newUser = await this.authRepository.insert(user);

    return newUser.id!;
  }

  async get(id: number): Promise<User> {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw AppError.from(ErrUserNotFound, 404);
    }
    return user;
  }

  async profile(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw AppError.from(ErrUserNotFound, 404);
    }
    const { password, ...profile } = user;
    return profile;
  }

  async update(id: number, data: UserUpdateDto): Promise<void> {
    const userExists = await this.authRepository.findById(id);
    if (!userExists) {
      throw AppError.from(ErrUserNotFound, 404);
    }
    await this.authRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const userExists = await this.authRepository.findById(id);
    if (!userExists) {
      throw AppError.from(ErrUserNotFound, 404);
    }
    await this.authRepository.delete(id);
  }

  async list(filter: UserFilterDto, paging: PagingDto): Promise<Paginated<User>> {
    const dto = userFilterDtoSchema.parse(filter);
    return await this.authRepository.list(dto, paging);
  }

  async test(): Promise<void> {
    const event = AuthTestEvent.create({
      id: randomInt(1, 1000),
      message: 'Test message from Auth Service',
      timestamp: new Date().toISOString(),
    }, 'auth-service');

    await this.eventPublisher.publish(event);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = 10;
    return bcrypt.hash(password, salt);
  }
}