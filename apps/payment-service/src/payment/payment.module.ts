import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { RabbitMQModule, RabbitMQService } from '@app/contracts/rmq';
import { PaymentRepository } from './payment.repository';
import {
  ORDER_SERVICE,
  PAYMENT_REPOSITORY,
  USER_SERVICE,
} from '@app/contracts';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';
import { VNPayService } from './services/vnpay.service';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [PaymentController],
  providers: [
    VNPayService,
    PaymentService,
    PaymentRepository,
    {
      provide: PAYMENT_REPOSITORY,
      useExisting: PaymentRepository,
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
      provide: USER_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.userServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class PaymentModule {}
