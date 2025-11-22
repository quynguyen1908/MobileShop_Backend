import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from '@app/prisma';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { USER_SERVICE_NAME } from '@app/contracts/user';
import { LoggingModule } from '@app/logging';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    UserModule,
    PrismaModule,
    PrometheusModule.register(USER_SERVICE_NAME),
    LoggingModule.register({ serviceName: USER_SERVICE_NAME }),
  ],
  controllers: [MetricsController],
  providers: [],
})
export class UserServiceModule {}
