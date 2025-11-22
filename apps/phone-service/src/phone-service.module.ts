import { Module } from '@nestjs/common';
import { PhoneModule } from './phone/phone.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { PrismaModule } from '@app/prisma';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { PHONE_SERVICE_NAME } from '@app/contracts/phone';
import { LoggingModule } from '@app/logging';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    PhoneModule,
    PrismaModule,
    PrometheusModule.register(PHONE_SERVICE_NAME),
    LoggingModule.register({ serviceName: PHONE_SERVICE_NAME }),
    SearchModule,
  ],
  controllers: [MetricsController],
  providers: [],
})
export class PhoneServiceModule {}
