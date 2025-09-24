import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserEventHandler } from './user-event.handler';
import { RabbitMQModule } from '@app/contracts/rmq';
import { USER_REPOSITORY, USER_SERVICE } from '@app/contracts';

@Module({
  imports: [
    RabbitMQModule.register(),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserEventHandler,
    {
      provide: USER_SERVICE,
      useExisting: UserService,
    },
    {
      provide: USER_REPOSITORY,
      useExisting: UserRepository,
    },
  ],
})
export class UserModule {}
