import { Inject, Injectable } from '@nestjs/common';
import type { IAuthRepository, IAuthService, IRoleQueryRepository } from './auth.port';
import type { IEventPublisher, ITokenProvider, TokenResponse } from '@app/contracts/interface';
import * as bcrypt from 'bcrypt';
import { AppError, EVENT_PUBLISHER, Paginated, PagingDto, TOKEN_PROVIDER, ROLE_REPOSITORY, AUTH_REPOSITORY } from '@app/contracts';
import { ErrUsernameAlreadyExists, ErrEmailAlreadyExists, ErrUserNotFound, RegisterDto, User, UserCreateDto, UserFilterDto, userFilterDtoSchema, userSchema, UserStatus, UserUpdateDto, AuthRegisteredEvent, ErrPhoneAlreadyExists } from '@app/contracts/auth';

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

  private async hashPassword(password: string): Promise<string> {
    const salt = 10;
    return bcrypt.hash(password, salt);
  }
}
