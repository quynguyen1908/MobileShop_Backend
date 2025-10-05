import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { PrismaModule } from '@app/contracts/prisma';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    OrderModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class OrderServiceModule {}
