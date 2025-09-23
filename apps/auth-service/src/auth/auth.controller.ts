import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { AUTH_PATTERN } from '@app/contracts/auth';
import type { UserCreateDto, UserUpdateProfileDto, UserUpdateDto, UserFilterDto, User } from '@app/contracts/auth';
import { PagingDto, TokenResponse } from '@app/contracts';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @MessagePattern(AUTH_PATTERN.REGISTER)
  async register(@Payload() registerDto: any): Promise<{ userId: number; tokens: TokenResponse }> {
    return this.authService.register(registerDto);
  }

  @MessagePattern(AUTH_PATTERN.CREATE_USER)
  async create(@Payload() userCreateDto: UserCreateDto): Promise<number> {
    return this.authService.create(userCreateDto);
  }

  @MessagePattern(AUTH_PATTERN.GET_USER)
  async get(@Payload() id: number) {
    return this.authService.get(id).then(user => this._toResponseModel(user));
  }

  @MessagePattern(AUTH_PATTERN.GET_PROFILE)
  async profile(@Payload() id: number) {
    return this.authService.profile(id);
  }

  @MessagePattern(AUTH_PATTERN.UPDATE_PROFILE)
  async updateProfile(@Payload() payload: { id: number; data: UserUpdateProfileDto }): Promise<void> {
    const { id, data } = payload;
    return this.authService.update(id, data);
  }

  @MessagePattern(AUTH_PATTERN.UPDATE_USER)
  async update(@Payload() payload: { id: number; data: UserUpdateDto }): Promise<void> {
    const { id, data } = payload;
    return this.authService.update(id, data);
  }

  @MessagePattern(AUTH_PATTERN.DELETE_USER)
  async delete(@Payload() id: number): Promise<void> {
    return this.authService.delete(id);
  }

  @MessagePattern(AUTH_PATTERN.LIST_USERS)
  async list(@Payload() payload: { filter: UserFilterDto; paging: PagingDto }) {
    const { filter, paging } = payload;
    return this.authService.list(filter, paging).then(result => ({
      ...result,
      data: result.data.map(user => this._toResponseModel(user)),
    }));
  }

  private _toResponseModel(data: User): Omit<User, 'password'> {
    const { password, ...response } = data;
    return response;
  }
}
