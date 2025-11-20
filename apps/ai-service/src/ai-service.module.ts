import { Module } from '@nestjs/common';
import { AiServiceHealthController } from './ai-service.controller';
import { EtlModule } from './etl/etl.module';
import { RagModule } from './rag/rag.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { ToolsModule } from './tools/tools.module';
import aiConfig from '@app/contracts/ai/ai.config';
import { MetricsController, PrometheusModule } from '@app/monitoring';
import { AI_SERVICE_NAME } from '@app/contracts';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [aiConfig],
    }),
    EtlModule,
    RagModule,
    ToolsModule,
    PrometheusModule.register(AI_SERVICE_NAME),
  ],
  controllers: [AiServiceHealthController, MetricsController],
})
export class AiServiceModule {}
