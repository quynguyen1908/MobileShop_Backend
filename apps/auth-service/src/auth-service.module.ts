import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from '@app/contracts/prisma';
import { JwtTokenModule } from '@app/contracts/jwt';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { AUTH_SERVICE_NAME } from '@app/contracts/auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    JwtTokenModule,
    PrometheusModule.register(AUTH_SERVICE_NAME),
  ],
  controllers: [MetricsController],
  providers: [],
})
export class AuthServiceModule {}
