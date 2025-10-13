import { Controller, Get } from '@nestjs/common';

@Controller('v1/health')
export class AiServiceHealthController {
  constructor() {}

  @Get()
  check() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }
}
