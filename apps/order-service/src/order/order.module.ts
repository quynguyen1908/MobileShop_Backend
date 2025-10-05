import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';
import { OrderRepository } from './order.repository';
import { ORDER_REPOSITORY, PHONE_SERVICE, USER_SERVICE } from '@app/contracts';
import { RabbitMQService } from '@app/contracts/rmq/rmq.service';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    {
      provide: ORDER_REPOSITORY,
      useExisting: OrderRepository,
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
      provide: USER_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.userServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class OrderModule {}
