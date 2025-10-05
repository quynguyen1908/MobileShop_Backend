import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@app/contracts/rmq';
import { UserModule } from './user/user.module';
import { HealthController } from './api-gateway.controller';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { PhoneModule } from './phone/phone.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule.register(),
    UserModule,
    CircuitBreakerModule,
    PhoneModule,
    OrderModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class ApiGatewayModule {}
