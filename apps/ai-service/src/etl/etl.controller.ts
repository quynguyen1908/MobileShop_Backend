import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ETLService } from './services/etl.service';
import { RemoteAuthGuard } from '@app/contracts/auth';
import { Roles, RoleType } from '@app/contracts/auth/roles.decorator';

@ApiTags('ETL')
@Controller('v1/ai/etl')
export class EtlController {
  constructor(private readonly etlService: ETLService) {}

  @Get('ingest')
  @ApiOperation({ summary: 'Trigger document ingestion process' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion process started successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @UseGuards(RemoteAuthGuard)
  @Roles(RoleType.ADMIN)
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
