import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { RabbitMQService } from '@app/contracts/rmq/rmq.service';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { ORDER_SERVICE } from '@app/contracts';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';

@Module({
  imports: [RabbitMQModule.register(), CircuitBreakerModule],
  controllers: [OrderController],
  providers: [
    {
      provide: ORDER_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.orderServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class OrderModule {}
