import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('v1/health')
export class AiServiceHealthController {
  constructor() {}

  @Get()
  check() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }
}
