import { Module } from '@nestjs/common';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { RabbitMQModule, RabbitMQService } from '@app/rabbitmq';
import { VoucherRepository } from './voucher.repository';
import {
  PAYMENT_SERVICE,
  PHONE_SERVICE,
  VOUCHER_REPOSITORY,
  VOUCHER_SERVICE,
} from '@app/contracts';
import { ClientProxyFactory } from '@nestjs/microservices';
import { VoucherEventHandler } from './voucher-event.handler';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [VoucherController],
  providers: [
    VoucherService,
    VoucherRepository,
    VoucherEventHandler,
    {
      provide: VOUCHER_SERVICE,
      useExisting: VoucherService,
    },
    {
      provide: VOUCHER_REPOSITORY,
      useExisting: VoucherRepository,
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
export class VoucherModule {}
