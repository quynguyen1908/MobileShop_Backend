import { Module } from '@nestjs/common';
import { EtlController } from './etl.controller';
import { ExtractService, TransformService, LoadService } from './etl.service';

@Module({
  controllers: [EtlController],
  providers: [ExtractService, TransformService, LoadService],
})
export class EtlModule {}
