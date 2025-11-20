import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@app/rabbitmq';
import { UserModule } from './user/user.module';
import { HealthController } from './api-gateway.controller';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { PhoneModule } from './phone/phone.module';
import { OrderModule } from './order/order.module';
import { AiModule } from './ai/ai.module';
import { PaymentModule } from './payment/payment.module';
import { VoucherModule } from './voucher/voucher.module';
import paymentConfig from '@app/contracts/payment/payment.config';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { API_GATEWAY_NAME } from '@app/contracts';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [paymentConfig],
    }),
    RabbitMQModule.register(),
    UserModule,
    CircuitBreakerModule,
    PhoneModule,
    OrderModule,
    AiModule,
    PaymentModule,
    VoucherModule,
    PrometheusModule.register(API_GATEWAY_NAME),
  ],
  controllers: [HealthController, MetricsController],
  providers: [],
})
export class ApiGatewayModule {}
