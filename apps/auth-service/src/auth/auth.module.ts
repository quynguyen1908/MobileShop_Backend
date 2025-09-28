import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthEventHandler } from './auth-event.handler';
import { RabbitMQModule } from '@app/contracts/rmq';
import {
  AuthRepository,
  OAuthRepository,
  RoleRepository,
} from './auth.repository';
import {
  AUTH_SERVICE,
  ROLE_REPOSITORY,
  AUTH_REPOSITORY,
  OAUTH_REPOSITORY,
} from '@app/contracts';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEventHandler,
    AuthRepository,
    RoleRepository,
    OAuthRepository,
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
    {
      provide: OAUTH_REPOSITORY,
      useExisting: OAuthRepository,
    },
  ],
})
export class AuthModule {}
