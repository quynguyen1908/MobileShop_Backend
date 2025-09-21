import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { AuthModule } from './auth/auth.module';
import { ServiceConfigModule } from './service-config/service-config.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [AuthModule, ServiceConfigModule, UserModule],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
