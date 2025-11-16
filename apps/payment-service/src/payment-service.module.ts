import { Module } from '@nestjs/common';
import { PaymentModule } from './payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/contracts/prisma';
import paymentConfig from '@app/contracts/payment/payment.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { PAYMENT_SERVICE_NAME } from '@app/contracts/payment';

@Module({
  imports: [
    PaymentModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [paymentConfig],
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    PrometheusModule.register(PAYMENT_SERVICE_NAME),
  ],
  controllers: [MetricsController],
  providers: [],
})
export class PaymentServiceModule {}
