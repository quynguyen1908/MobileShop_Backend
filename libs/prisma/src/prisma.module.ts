import { Module, Global } from '@nestjs/common';
import { UserPrismaService } from './user-prisma.service';
import { PhonePrismaService } from './phone-prisma.service';
import { OrderPrismaService } from './order-prisma.service';
import { PaymentPrismaService } from './payment-prisma.service';
import { VoucherPrismaService } from './voucher-prisma.service';

@Global()
@Module({
  providers: [
    UserPrismaService,
    PhonePrismaService,
    OrderPrismaService,
    PaymentPrismaService,
    VoucherPrismaService,
  ],
  exports: [
    UserPrismaService,
    PhonePrismaService,
    OrderPrismaService,
    PaymentPrismaService,
    VoucherPrismaService,
  ],
})
export class PrismaModule {}
