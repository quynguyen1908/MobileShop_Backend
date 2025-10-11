import { Module } from '@nestjs/common';
import { EtlController } from './etl.controller';
import { ETLService } from './services/etl.service';
import { ExtractService } from './services/extract.service';
import { TransformService } from './services/transform.service';
import { LoadService } from './services/load.service';
import { OpenAIEmbeddingsProvider } from '../ai-service.provider';
import { RagModule } from '../rag/rag.module';
import { JwtTokenModule } from '@app/contracts/jwt/jwt.module';

@Module({
  imports: [RagModule, JwtTokenModule],
  controllers: [EtlController],
  providers: [
    ETLService,
    ExtractService,
    TransformService,
    LoadService,
    OpenAIEmbeddingsProvider,
  ],
})
export class EtlModule {}
