import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from '@app/contracts/prisma';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    UserModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class UserServiceModule {}
