import { Module } from '@nestjs/common';
import { PhoneController } from './phone.controller';
import { PhoneService } from './phone.service';
import { PhoneRepository } from './phone.repository';
import { PHONE_REPOSITORY, PHONE_SERVICE } from '@app/contracts';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';
import { PhoneEventHandler } from './phone-event.handler';
import { HttpModule } from '@nestjs/axios';

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
  ],
})
export class PhoneModule {}
