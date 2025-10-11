import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RETRIEVAL_REPOSITORY } from '@app/contracts';
import { RetrievalRepository } from './rag.repository';
import {
  AgentExecutorProvider,
  AgentToolsProvider,
  OpenAIChatModelProvider,
  OpenAIEmbeddingsProvider,
} from '../ai-service.provider';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [ToolsModule],
  controllers: [RagController],
  providers: [
    RagService,
    {
      provide: RETRIEVAL_REPOSITORY,
      useClass: RetrievalRepository,
    },
    AgentExecutorProvider,
    OpenAIEmbeddingsProvider,
    OpenAIChatModelProvider,
    AgentToolsProvider,
  ],
  exports: [RETRIEVAL_REPOSITORY],
})
export class RagModule {}
