import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { RabbitMQModule, RabbitMQService } from '@app/rabbitmq';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { PAYMENT_SERVICE } from '@app/contracts';
import { ClientProxyFactory } from '@nestjs/microservices';

@Module({
  imports: [RabbitMQModule.register(), CircuitBreakerModule],
  controllers: [PaymentController],
  providers: [
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
export class PaymentModule {}
