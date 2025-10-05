import { Module, Global } from '@nestjs/common';
import { UserPrismaService } from './user-prisma.service';
import { PhonePrismaService } from './phone-prisma.service';
import { OrderPrismaService } from './order-prisma.service';

@Global()
@Module({
  providers: [UserPrismaService, PhonePrismaService, OrderPrismaService],
  exports: [UserPrismaService, PhonePrismaService, OrderPrismaService],
})
export class PrismaModule {}
