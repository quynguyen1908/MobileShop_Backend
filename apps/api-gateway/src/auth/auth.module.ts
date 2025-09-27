import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientProxyFactory } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts';
import { RabbitMQModule, RabbitMQService } from '@app/contracts/rmq';
import { JwtTokenModule } from '@app/contracts/jwt';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from '@app/contracts/auth';

@Module({
  imports: [
    RabbitMQModule.register(),
    JwtTokenModule,
    CircuitBreakerModule,
    PassportModule.register({ defaultStrategy: 'google' }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.authServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
    GoogleStrategy,
  ],
})
export class AuthModule {}
