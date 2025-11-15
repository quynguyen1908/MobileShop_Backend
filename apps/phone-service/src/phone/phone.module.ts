import { Module } from '@nestjs/common';
import { PhoneController } from './phone.controller';
import { PhoneService } from './phone.service';
import { PhoneRepository } from './phone.repository';
import {
  ORDER_SERVICE,
  PHONE_REPOSITORY,
  PHONE_SERVICE,
  USER_SERVICE,
} from '@app/contracts';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';
import { PhoneEventHandler } from './phone-event.handler';
import { HttpModule } from '@nestjs/axios';
import { RabbitMQService } from '@app/contracts/rmq';
import { ClientProxyFactory } from '@nestjs/microservices';

@Module({
  imports: [
    RabbitMQModule.register(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [PhoneController],
  providers: [
    PhoneService,
    PhoneRepository,
    PhoneEventHandler,
    {
      provide: PHONE_SERVICE,
      useExisting: PhoneService,
    },
    {
      provide: PHONE_REPOSITORY,
      useExisting: PhoneRepository,
    },
    {
      provide: USER_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.userServiceOptions;
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
  ],
})
export class PhoneModule {}
