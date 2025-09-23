import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthEventHandler } from './auth-event.handler';
import { AuthRepository, RoleRepository } from './auth.repository';
import { AUTH_SERVICE, ROLE_REPOSITORY, AUTH_REPOSITORY } from '@app/contracts';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEventHandler,
    AuthRepository,
    RoleRepository,
    {
      provide: AUTH_SERVICE,
      useExisting: AuthService,
    },
    {
      provide: AUTH_REPOSITORY,
      useExisting: AuthRepository,
    },
    {
      provide: ROLE_REPOSITORY,
      useExisting: RoleRepository,
    },
  ],
})
export class AuthModule {}
