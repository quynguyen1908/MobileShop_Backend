import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { RabbitMQModule, RabbitMQService } from '@app/rabbitmq';
import { PaymentRepository } from './payment.repository';
import {
  ORDER_SERVICE,
  PAYMENT_REPOSITORY,
  PAYMENT_SERVICE,
  USER_SERVICE,
} from '@app/contracts';
import { ClientProxyFactory } from '@nestjs/microservices/client/client-proxy-factory';
import { VNPayService } from './services/vnpay.service';
import { PaymentService } from './services/payment.service';
import { PaymentEventHandler } from './payment-event.handler';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [PaymentController],
  providers: [
    VNPayService,
    PaymentService,
    PaymentRepository,
    PaymentEventHandler,
    {
      provide: PAYMENT_SERVICE,
      useExisting: PaymentService,
    },
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
