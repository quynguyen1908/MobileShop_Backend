import { Module } from '@nestjs/common';
import {
  CircuitBreakerMetricsService,
  CircuitBreakerService,
} from './circuit-breaker.service';

@Module({
  providers: [CircuitBreakerService, CircuitBreakerMetricsService],
  exports: [CircuitBreakerService, CircuitBreakerMetricsService],
})
export class CircuitBreakerModule {}
