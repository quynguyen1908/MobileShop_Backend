import { Module, Global } from '@nestjs/common';
import { UserPrismaService } from './user-prisma.service';
import { PhonePrismaService } from './phone-prisma.service';
import { OrderPrismaService } from './order-prisma.service';
import { PaymentPrismaService } from './payment-prisma.service';

@Global()
@Module({
  providers: [
    UserPrismaService,
    PhonePrismaService,
    OrderPrismaService,
    PaymentPrismaService,
  ],
  exports: [
    UserPrismaService,
    PhonePrismaService,
    OrderPrismaService,
    PaymentPrismaService,
  ],
})
export class PrismaModule {}
