import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { PrismaModule } from '@app/contracts/prisma';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { ORDER_SERVICE_NAME } from '@app/contracts/order';

@Module({
  imports: [
    OrderModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    PrometheusModule.register(ORDER_SERVICE_NAME),
  ],
  controllers: [MetricsController],
  providers: [],
})
export class OrderServiceModule {}
