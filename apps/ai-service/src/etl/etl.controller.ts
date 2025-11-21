import { Controller, Get, Logger } from '@nestjs/common';
import { ETLService } from './services/etl.service';

@Controller('v1/ai/etl')
export class EtlController {
  private readonly logger = new Logger(EtlController.name);

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
      this.logger.error('ETL Ingestion Error:', error);
      throw error;
    }
  }
}
