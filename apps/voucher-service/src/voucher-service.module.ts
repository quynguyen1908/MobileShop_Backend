import { Module } from '@nestjs/common';
import { VoucherModule } from './voucher/voucher.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/prisma';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { VOUCHER_SERVICE_NAME } from '@app/contracts/voucher';
import { LoggingModule } from '@app/logging';

@Module({
  imports: [
    VoucherModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    PrometheusModule.register(VOUCHER_SERVICE_NAME),
    LoggingModule.register({ serviceName: VOUCHER_SERVICE_NAME }),
  ],
  controllers: [MetricsController],
  providers: [],
})
export class VoucherServiceModule {}
