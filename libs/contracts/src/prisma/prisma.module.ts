import { Module, Global } from '@nestjs/common';
import { UserPrismaService } from './user-prisma.service';
import { PhonePrismaService } from './phone-prisma.service';

@Global()
@Module({
  providers: [UserPrismaService, PhonePrismaService],
  exports: [UserPrismaService, PhonePrismaService],
})
export class PrismaModule {}
