import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from '@app/prisma';
import { JwtTokenModule } from '@app/contracts/jwt';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { AUTH_SERVICE_NAME } from '@app/contracts/auth';
import { LoggingModule } from '@app/logging';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    JwtTokenModule,
    PrometheusModule.register(AUTH_SERVICE_NAME),
    LoggingModule.register({ serviceName: AUTH_SERVICE_NAME }),
  ],
  controllers: [MetricsController],
  providers: [],
})
export class AuthServiceModule {}
