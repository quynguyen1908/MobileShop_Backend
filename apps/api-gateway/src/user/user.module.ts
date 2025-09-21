import { Module } from '@nestjs/common';
import { ClientProxyFactory } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ServiceConfigModule } from '../service-config/service-config.module';
import { ServiceConfigService } from '../service-config/service-config.service';

@Module({
  imports: [ServiceConfigModule],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: USER_SERVICE,
      useFactory: (configService: ServiceConfigService) => {
        const serverOptions = configService.userServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [ServiceConfigService],
    },
  ],
})
export class UserModule {}
