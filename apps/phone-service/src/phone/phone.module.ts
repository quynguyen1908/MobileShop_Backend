import { Module } from '@nestjs/common';
import { PhoneController } from './phone.controller';
import { PhoneService } from './phone.service';
import { PhoneRepository } from './phone.repository';
import { PHONE_REPOSITORY, PHONE_SERVICE } from '@app/contracts';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';
import { PhoneEventHandler } from './phone-event.handler';

@Module({
  imports: [RabbitMQModule.register()],
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
