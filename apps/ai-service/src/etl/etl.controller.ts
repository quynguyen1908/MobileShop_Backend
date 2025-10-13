import { Controller, Get } from '@nestjs/common';
import { ETLService } from './services/etl.service';

@Controller('v1/ai/etl')
export class EtlController {
  constructor(private readonly etlService: ETLService) {}

  @Get('ingest')
  async ingest() {
    try {
      await this.etlService.documentIngestion();
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      console.error('ETL Ingestion Error:', error);
      throw error;
    }
  }
}
