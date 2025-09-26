import { Module } from '@nestjs/common';
import { ClientProxyFactory } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts';
import { UserController } from './user.controller';
import { RabbitMQModule, RabbitMQService } from '@app/contracts/rmq';

@Module({
  imports: [RabbitMQModule.register()],
  controllers: [UserController],
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
