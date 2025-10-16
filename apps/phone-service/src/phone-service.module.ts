import { Module } from '@nestjs/common';
import { PhoneModule } from './phone/phone.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { PrismaModule } from '@app/contracts/prisma';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    PhoneModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class PhoneServiceModule {}
