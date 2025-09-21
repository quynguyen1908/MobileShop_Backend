import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from '@app/contracts/prisma';

@Module({
  imports: [
    UserModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class UserServiceModule {}
