import { Module } from '@nestjs/common';
import { ClientProxyFactory } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts';
import {
  LocationController,
  CustomerController,
  NotificationController,
} from './user.controller';
import { RabbitMQModule, RabbitMQService } from '@app/contracts/rmq';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';

@Module({
  imports: [RabbitMQModule.register(), CircuitBreakerModule],
  controllers: [CustomerController, LocationController, NotificationController],
  providers: [
    {
      provide: USER_SERVICE,
      useFactory: (rmqConfigService: RabbitMQService) => {
        const serverOptions = rmqConfigService.userServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [RabbitMQService],
    },
  ],
})
export class UserModule {}
