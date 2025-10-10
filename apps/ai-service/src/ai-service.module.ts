import { Module } from '@nestjs/common';
import { AiServiceHealthController } from './ai-service.controller';
import { EtlModule } from './etl/etl.module';
import { RagModule } from './rag/rag.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import aiConfig from '@app/contracts/ai/ai.config';
import {
  OpenAIChatModelProvider,
  OpenAIEmbeddingsProvider,
} from './ai-service.provider';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [aiConfig],
    }),
    EtlModule,
    RagModule,
  ],
  controllers: [AiServiceHealthController],
  providers: [OpenAIEmbeddingsProvider, OpenAIChatModelProvider],
})
export class AiServiceModule {}
