import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { PrismaModule } from '@app/contracts/prisma';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    OrderModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class OrderServiceModule {}
