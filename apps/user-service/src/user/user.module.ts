import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserEventHandler } from './user-event.handler';
import { RabbitMQModule, RabbitMQService } from '@app/contracts/rmq';
import {
  AUTH_SERVICE,
  ORDER_SERVICE,
  PAYMENT_SERVICE,
  PHONE_SERVICE,
  USER_REPOSITORY,
  USER_SERVICE,
} from '@app/contracts';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserEventHandler,
    {
      provide: USER_SERVICE,
      useExisting: UserService,
    },
    {
      provide: USER_REPOSITORY,
      useExisting: UserRepository,
    },
    {
      provide: AUTH_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.authServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
    {
      provide: ORDER_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.orderServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
    {
      provide: PHONE_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.phoneServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
    {
      provide: PAYMENT_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.paymentServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class UserModule {}
