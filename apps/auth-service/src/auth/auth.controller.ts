import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { AUTH_PATTERN } from '@app/contracts/auth';
import type {
  LoginDto,
  RegisterDto,
  UserCreateDto,
  UserUpdateProfileDto,
  UserUpdateDto,
  UserFilterDto,
  User,
  GoogleResponseDto,
} from '@app/contracts/auth';
import type { PagingDto, Requester, TokenResponse } from '@app/contracts';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AUTH_PATTERN.REGISTER)
  async register(
    @Payload() registerDto: RegisterDto,
  ): Promise<{ userId: number; tokens: TokenResponse }> {
    return this.authService.register(registerDto);
  }

  @MessagePattern(AUTH_PATTERN.LOGIN)
  async login(
    @Payload() loginDto: LoginDto,
  ): Promise<{ userId: number; tokens: TokenResponse }> {
    return this.authService.login(loginDto);
  }

  @MessagePattern(AUTH_PATTERN.LOGOUT)
  async logout(@Payload() request: Requester): Promise<boolean> {
    return this.authService.logout(request);
  }

  @MessagePattern(AUTH_PATTERN.CHANGE_PASSWORD)
  async changePassword(
    @Payload()
    payload: {
      requester: Requester;
      currentPassword: string;
      newPassword: string;
    },
  ): Promise<boolean> {
    const { requester, currentPassword, newPassword } = payload;
    return this.authService.changePassword(
      requester,
      currentPassword,
      newPassword,
    );
  }

  @MessagePattern(AUTH_PATTERN.REFRESH_TOKEN)
  async refreshToken(@Payload() refreshToken: string): Promise<TokenResponse> {
    return this.authService.refreshToken(refreshToken);
  }

  @MessagePattern(AUTH_PATTERN.VALIDATE_TOKEN)
  async validateToken(@Payload() accessToken: string): Promise<Requester> {
    return this.authService.validateToken(accessToken);
  }

  @MessagePattern(AUTH_PATTERN.DECODE_TOKEN)
  decodeToken(@Payload() token: string): Requester | null {
    return this.authService.decodeToken(token);
  }

  @MessagePattern(AUTH_PATTERN.GOOGLE_LOGIN)
  async googleLogin(
    @Payload() profile: GoogleResponseDto,
  ): Promise<{ userId: number; tokens: TokenResponse }> {
    return this.authService.loginWithGoogle(profile);
  }

  @MessagePattern(AUTH_PATTERN.CREATE_USER)
  async create(@Payload() userCreateDto: UserCreateDto): Promise<number> {
    return this.authService.create(userCreateDto);
  }

  @MessagePattern(AUTH_PATTERN.GET_USER)
  async get(@Payload() id: number) {
    return this.authService.get(id).then((user) => this._toResponseModel(user));
  }

  @MessagePattern(AUTH_PATTERN.GET_USER_BY_EMAIL)
  async getByEmail(@Payload() email: string) {
    const user = await this.authService.getByFilter({ email } as UserFilterDto);
    if (!user) {
      return null;
    }
    return this._toResponseModel(user);
  }

  @MessagePattern(AUTH_PATTERN.GET_PROFILE)
  async profile(@Payload() id: number) {
    return this.authService.profile(id);
  }

  @MessagePattern(AUTH_PATTERN.UPDATE_PROFILE)
  async updateProfile(
    @Payload() payload: { id: number; data: UserUpdateProfileDto },
  ): Promise<void> {
    const { id, data } = payload;
    return this.authService.update(id, data);
  }

  @MessagePattern(AUTH_PATTERN.UPDATE_USER)
  async update(
    @Payload() payload: { id: number; data: UserUpdateDto },
  ): Promise<void> {
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
    return this.authService.list(filter, paging).then((result) => ({
      ...result,
      data: result.data.map((user) => this._toResponseModel(user)),
    }));
  }

  @MessagePattern(AUTH_PATTERN.TEST)
  async test(@Payload() payload: { timestamp: string }) {
    console.log(
      'Received test message with payload:',
      payload,
      'at',
      new Date().toISOString(),
    );

    await this.authService.test();

    return {
      message: 'Auth service is working!',
      timestamp: new Date().toISOString(),
      receivedTimestamp: payload.timestamp,
      serviceInfo: {
        name: 'Auth Service',
        version: '1.0.0',
        status: 'healthy',
      },
    };
  }

  private _toResponseModel(data: User): Omit<User, 'password'> {
    const { password: _, ...response } = data;
    return response;
  }
}
