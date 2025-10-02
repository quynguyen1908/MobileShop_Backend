import { Module } from '@nestjs/common';
import { PhoneModule } from './phone/phone.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { PrismaModule } from '@app/contracts/prisma';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PhoneModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class PhoneServiceModule {}
