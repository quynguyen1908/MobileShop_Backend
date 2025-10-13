import { Module } from '@nestjs/common';
import { EtlController } from './etl.controller';
import { ETLService } from './services/etl.service';
import { ExtractService } from './services/extract.service';
import { TransformService } from './services/transform.service';
import { LoadService } from './services/load.service';
import { OpenAIEmbeddingsProvider } from '../ai-service.provider';
import { RagModule } from '../rag/rag.module';
import { JwtTokenModule } from '@app/contracts/jwt/jwt.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    RagModule,
    JwtTokenModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
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
