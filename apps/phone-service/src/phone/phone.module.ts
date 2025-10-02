import { Module } from '@nestjs/common';
import { PhoneController } from './phone.controller';
import { PhoneService } from './phone.service';
import { PhoneRepository } from './phone.repository';
import { PHONE_REPOSITORY } from '@app/contracts';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [PhoneController],
  providers: [
    PhoneService,
    PhoneRepository,
    {
      provide: PHONE_REPOSITORY,
      useExisting: PhoneRepository,
    },
  ],
})
export class PhoneModule {}
