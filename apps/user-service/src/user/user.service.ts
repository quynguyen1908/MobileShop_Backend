import { Inject, Injectable } from '@nestjs/common';
import { UserCreateDto, UserUpdateDto } from '@app/contracts/user';
import type { IUserService, IUserRepository } from './user.port';
import type { ITokenProvider } from '@app/contracts';
import { USER_REPOSITORY, TOKEN_PROVIDER } from '@app/contracts';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_PROVIDER) private readonly tokenProvider: ITokenProvider,
  ) {}
}
