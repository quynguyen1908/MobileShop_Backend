import { Module } from '@nestjs/common';
import { ServiceConfigService } from './service-config.service';
import { ConfigModule } from '@nestjs/config';
import * as joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: false,
      validationSchema: joi.object({
        AUTH_SERVICE_PORT: joi.number().default(3001),
        USER_SERVICE_PORT: joi.number().default(3002),
      }),
    }),
  ],
  providers: [ServiceConfigService],
  exports: [ServiceConfigService]
})
export class ServiceConfigModule {}
