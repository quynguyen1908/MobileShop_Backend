import { Module } from '@nestjs/common';
import { VoucherModule } from './voucher/voucher.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/contracts/prisma';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    VoucherModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class VoucherServiceModule {}
