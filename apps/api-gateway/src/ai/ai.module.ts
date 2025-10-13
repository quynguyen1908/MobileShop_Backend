import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AiController],
})
export class AiModule {}
