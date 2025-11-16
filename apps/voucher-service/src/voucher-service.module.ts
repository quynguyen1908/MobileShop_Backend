import { Module } from '@nestjs/common';
import { VoucherModule } from './voucher/voucher.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/contracts/prisma';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { VOUCHER_SERVICE_NAME } from '@app/contracts/voucher';

@Module({
  imports: [
    VoucherModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    PrometheusModule.register(VOUCHER_SERVICE_NAME),
  ],
  controllers: [MetricsController],
  providers: [],
})
export class VoucherServiceModule {}
