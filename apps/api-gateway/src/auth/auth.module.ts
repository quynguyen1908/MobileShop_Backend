import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientProxyFactory } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts';
import { RabbitMQModule, RabbitMQService } from '@app/contracts/rmq';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AUTH_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.authServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class AuthModule {}
