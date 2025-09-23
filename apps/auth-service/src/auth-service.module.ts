import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from '@app/contracts/prisma';
import { JwtTokenModule } from '@app/contracts/jwt';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { RabbitMQModule } from '@app/contracts/rmq/rmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    JwtTokenModule,
    RabbitMQModule.register(),
  ],
  controllers: [],
  providers: [],
})
export class AuthServiceModule {}
