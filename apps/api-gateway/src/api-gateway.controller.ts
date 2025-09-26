import { Controller, Get, Param } from '@nestjs/common';
import {
  CircuitBreakerMetricsService,
  CircuitBreakerService,
} from './circuit-breaker/circuit-breaker.service';

@Controller('v1/health')
export class HealthController {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly circuitBreakerMetricsService: CircuitBreakerMetricsService,
  ) {}

  @Get()
  check() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  // TODO: Add authentication and authorization to these endpoints

  @Get('circuit-breakers')
  getCircuitBreakers() {
    return this.circuitBreakerMetricsService.getAllMetrics();
  }

  @Get('circuit-breakers/:serviceId/reset')
  resetCircuitBreaker(@Param('serviceId') serviceId: string) {
    const success = this.circuitBreakerService.resetBreaker(serviceId);
    return {
      success,
      message: success
        ? `Circuit breaker for ${serviceId} was reset`
        : `No circuit breaker found for ${serviceId}`,
    };
  }

  @Get('circuit-breakers/:serviceId/open')
  openCircuitBreaker(@Param('serviceId') serviceId: string) {
    const success = this.circuitBreakerService.openBreaker(serviceId);
    return {
      success,
      message: success
        ? `Circuit breaker for ${serviceId} was opened`
        : `No circuit breaker found for ${serviceId}`,
    };
  }
}
