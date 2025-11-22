import { Module, Global } from '@nestjs/common';
import { JwtTokenService, TokenValidator } from './jwt.service';
import { ConfigModule } from '@nestjs/config';
import { AUTH_SERVICE, TOKEN_PROVIDER, TOKEN_VALIDATOR } from '..';
import { TokenWhitelistRepository } from './jwt.repository';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';
import { RabbitMQModule, RabbitMQService } from '@app/rabbitmq';
import { UserPrismaService } from '@app/prisma';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RabbitMQModule.register(),
  ],
  providers: [
    TokenWhitelistRepository,
    UserPrismaService,
    TokenValidator,
    JwtTokenService,
    {
      provide: TOKEN_PROVIDER,
      useExisting: JwtTokenService,
    },
    {
      provide: TOKEN_VALIDATOR,
      useExisting: TokenValidator,
    },
    {
      provide: AUTH_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.authServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
  exports: [TOKEN_PROVIDER, TOKEN_VALIDATOR],
})
export class JwtTokenModule {}
