import { Module } from '@nestjs/common';
import { VoucherController } from './voucher.controller';
import { RabbitMQModule, RabbitMQService } from '@app/rabbitmq';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { VOUCHER_SERVICE } from '@app/contracts';
import { ClientProxyFactory } from '@nestjs/microservices';

@Module({
  imports: [RabbitMQModule.register(), CircuitBreakerModule],
  controllers: [VoucherController],
  providers: [
    {
      provide: VOUCHER_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.voucherServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class VoucherModule {}
