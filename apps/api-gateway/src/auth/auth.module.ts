import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientProxyFactory } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts';
import { ServiceConfigModule } from '../service-config/service-config.module';
import { ServiceConfigService } from '../service-config/service-config.service';

@Module({
  imports: [ServiceConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AUTH_SERVICE,
      useFactory: (configService: ServiceConfigService) => {
        const serverOptions = configService.authServiceOptions;
        return ClientProxyFactory.create(serverOptions);
      },
      inject: [ServiceConfigService],
    },
  ],
})

export class AuthModule {}
