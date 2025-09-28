import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  CircuitBreakerMetricsService,
  CircuitBreakerService,
} from './circuit-breaker/circuit-breaker.service';
import { RemoteAuthGuard, RolesGuard } from '@app/contracts/auth';
import { Roles, RoleType } from '@app/contracts/auth/roles.decorator';

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

  @Get('circuit-breakers')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  getCircuitBreakers() {
    return this.circuitBreakerMetricsService.getAllMetrics();
  }

  @Get('circuit-breakers/:serviceId/reset')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
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
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
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
