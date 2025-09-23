import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@app/contracts/rmq';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AuthModule, 
    ConfigModule.forRoot({  isGlobal: true }), 
    RabbitMQModule.register(),
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule {}
