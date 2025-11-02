import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import CircuitBreaker from 'opossum';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers: Map<string, CircuitBreaker> = new Map();

  getBreaker(
    serviceId: string,
    options: CircuitBreaker.Options = {},
  ): CircuitBreaker {
    if (this.breakers.has(serviceId)) {
      const breaker = this.breakers.get(serviceId);
      if (!breaker) {
        throw new Error(
          `CircuitBreaker for serviceId "${serviceId}" not found.`,
        );
      }
      return breaker;
    }

    const defaultOptions: CircuitBreaker.Options = {
      timeout: 5000,
      resetTimeout: 10000,
      errorThresholdPercentage: 70,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: serviceId,
      allowWarmUp: true,
      volumeThreshold: 20,
      errorFilter: (err: unknown) => {
        if (
          typeof err === 'object' &&
          err !== null &&
          'statusCode' in err &&
          typeof (err as { statusCode: unknown }).statusCode === 'number'
        ) {
          const statusCode = (err as { statusCode: number }).statusCode;
          if (statusCode >= 400 && statusCode < 500) return true;
        }
        return false;
      },
      ...options,
    };

    const breaker = new CircuitBreaker(
      async (context: {
        client: ClientProxy;
        pattern: string;
        data: unknown;
        timeoutMs?: number;
      }) => {
        const { client, pattern, data, timeoutMs } = context;
        return await firstValueFrom<unknown>(
          client
            .send(pattern, data)
            .pipe(
              timeout(
                (typeof timeoutMs === 'number' && !isNaN(timeoutMs)
                  ? timeoutMs
                  : (defaultOptions.timeout ?? 5000)) as number,
              ),
            ),
        );
      },
      defaultOptions,
    );

    this.setupEventHandlers(breaker, serviceId);

    this.breakers.set(serviceId, breaker);
    return breaker;
  }

  private setupEventHandlers(breaker: CircuitBreaker, serviceId: string): void {
    breaker.on('open', () => {
      this.logger.warn(`🔴 Circuit OPEN for service: ${serviceId}`);
    });

    breaker.on('close', () => {
      this.logger.log(`🟢 Circuit CLOSED for service: ${serviceId}`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`🟡 Circuit HALF-OPEN for service: ${serviceId}`);
    });

    breaker.on('fallback', (_, err) => {
      this.logger.warn(`⚠️ Fallback executed for ${serviceId}: ${err.message}`);
    });

    breaker.on('timeout', (err) => {
      this.logger.error(`⏱️ Timeout for ${serviceId}: ${err.message}`);
    });

    breaker.on('success', (_, latency) => {
      this.logger.debug(`✅ Success for ${serviceId} (${latency}ms)`);
    });

    breaker.on('failure', (err, latency) => {
      this.logger.error(
        `❌ Failure for ${serviceId} (${latency}ms): ${err.message}`,
      );
    });
  }

  async sendRequest<T>(
    client: ClientProxy,
    serviceId: string,
    pattern: string,
    data: any,
    fallbackFn?: (error: Error) => T | Promise<T>,
    options?: CircuitBreaker.Options,
  ): Promise<T> {
    const breaker = this.getBreaker(serviceId, options);

    if (fallbackFn) {
      breaker.fallback(async (err: unknown) => {
        const formattedError = this.formatError(err);
        this.logger.warn(
          `Executing fallback for ${serviceId}. Error: ${formattedError}`
        );
        return fallbackFn(formattedError);
      });
    }

    const context: {
      client: ClientProxy;
      pattern: string;
      data: unknown;
      timeoutMs?: number;
    } = { client, pattern, data };

    try {
      const result = await breaker.fire(context);
      return result as T;
    } catch (error) {
      const formattedError = this.formatError(error);
      this.logger.error(
        `Error executing request to ${serviceId}: ${formattedError.message}`,
        formattedError.stack
      );

      if (fallbackFn) {
        return fallbackFn(formattedError);
      }

      throw formattedError;
    }
  }

  getStatus(): Record<string, unknown> {
    const status: Record<string, unknown> = {};

    this.breakers.forEach((breaker, serviceId) => {
      status[serviceId] = {
        state: breaker.opened
          ? 'OPEN'
          : breaker.halfOpen
            ? 'HALF-OPEN'
            : breaker.closed
              ? 'CLOSED'
              : 'UNKNOWN',
        metrics: {
          failures: breaker.stats.failures,
          successes: breaker.stats.successes,
          rejects: breaker.stats.rejects,
          timeouts: breaker.stats.timeouts,
          fallbacks: breaker.stats.fallbacks,
          errorPercentage: `${(breaker.stats.failures / (breaker.stats.failures + breaker.stats.successes)) * 100 || 0}%`,
        },
      };
    });
    return status;
  }

  resetBreaker(serviceId: string): boolean {
    const breaker = this.breakers.get(serviceId);
    if (breaker) {
      breaker.close();
      return true;
    }
    return false;
  }

  openBreaker(serviceId: string): boolean {
    const breaker = this.breakers.get(serviceId);
    if (breaker) {
      breaker.open();
      return true;
    }
    return false;
  }

  private formatError(error: unknown): Error {
    try {
      if (error instanceof Error) {
        return error;
      }

      if (error && typeof error === 'object') {
        const errorInfo: Record<string, any> = {};
        
        if ('pattern' in error && 'data' in error) {
          errorInfo.pattern = (error as any).pattern;
          errorInfo.data = (error as any).data;
        }

        ['message', 'code', 'status', 'statusCode'].forEach(field => {
          if (field in error) {
            errorInfo[field] = (error as any)[field];
          }
        });

        return new Error(
          `Service error: ${JSON.stringify(errorInfo, null, 2)}`
        );
      }

      return new Error(
        typeof error === 'string' ? error : 'Unknown service error'
      );

    } catch (formatError) {
      this.logger.error('Error while formatting:', formatError);
      return new Error('Service communication error');
    }
  }
}

@Injectable()
export class CircuitBreakerMetricsService implements OnModuleInit {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  onModuleInit() {
    // Initialize metrics collection if needed
  }

  getAllMetrics() {
    return {
      timestamp: new Date().toISOString(),
      breakers: this.circuitBreakerService.getStatus(),
    };
  }
}
