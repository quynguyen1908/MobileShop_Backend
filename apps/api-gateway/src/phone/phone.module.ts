import { Module } from '@nestjs/common';
import { CategoryController, PhoneController } from './phone.controller';
import { RabbitMQService } from '@app/contracts/rmq/rmq.service';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';
import { PHONE_SERVICE } from '@app/contracts';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';

@Module({
  imports: [RabbitMQModule.register(), CircuitBreakerModule],
  controllers: [PhoneController, CategoryController],
  providers: [
    {
      provide: PHONE_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.phoneServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class PhoneModule {}
