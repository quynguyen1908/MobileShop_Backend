import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, RmqOptions } from '@nestjs/microservices';

@Injectable()
export class RabbitMQService {
  constructor(private configService: ConfigService) {}

  getRmqOptions(queue: string): RmqOptions {
    return {
      transport: Transport.RMQ,
      options: {
        urls: [this.getRmqUrl()],
        queue: queue,
        queueOptions: {
          durable: true,
        },
        prefetchCount: this.getPrefetchCount(),
        persistent: true,
      },
    };
  }

  getRmqUrl(): string {
    return this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://guest:guest@localhost:5672',
    );
  }

  getPrefetchCount(): number {
    const prefetchCount = this.configService.get<string | number | undefined>(
      'RABBITMQ_PREFETCH_COUNT',
    );
    const defaultPrefetchCount = 10;

    if (prefetchCount === undefined || prefetchCount === null) {
      return defaultPrefetchCount;
    }

    if (typeof prefetchCount === 'number') {
      return prefetchCount;
    }

    if (typeof prefetchCount === 'string') {
      const parsedValue = parseInt(prefetchCount, 10);
      return isNaN(parsedValue) ? defaultPrefetchCount : parsedValue;
    }

    return defaultPrefetchCount;
  }

  get authServiceOptions(): RmqOptions {
    return this.getRmqOptions(
      this.configService.get<string>('AUTH_SERVICE_QUEUE', 'auth_queue'),
    );
  }

  get userServiceOptions(): RmqOptions {
    return this.getRmqOptions(
      this.configService.get<string>('USER_SERVICE_QUEUE', 'user_queue'),
    );
  }
}
