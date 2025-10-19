import { Module } from '@nestjs/common';
import { PaymentModule } from './payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/contracts/prisma';
import paymentConfig from '@app/contracts/payment/payment.config';

@Module({
  imports: [
    PaymentModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [paymentConfig],
    }),
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class PaymentServiceModule {}
