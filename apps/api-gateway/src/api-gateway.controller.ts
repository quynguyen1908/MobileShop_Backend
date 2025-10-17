import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  CircuitBreakerMetricsService,
  CircuitBreakerService,
} from './circuit-breaker/circuit-breaker.service';
import { RemoteAuthGuard, RolesGuard } from '@app/contracts/auth';
import { Roles, RoleType } from '@app/contracts/auth/roles.decorator';
import { ApiOperation } from '@nestjs/swagger';

@Controller('v1/health')
export class HealthController {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly circuitBreakerMetricsService: CircuitBreakerMetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint for API Gateway' })
  check() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('circuit-breakers')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Get circuit breaker metrics (requires admin role)',
  })
  getCircuitBreakers() {
    return this.circuitBreakerMetricsService.getAllMetrics();
  }

  @Get('circuit-breakers/:serviceId/reset')
  @UseGuards(RemoteAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @ApiOperation({
    summary: 'Reset circuit breaker for a service (requires admin role)',
  })
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
  @ApiOperation({
    summary: 'Open circuit breaker for a service (requires admin role)',
  })
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
