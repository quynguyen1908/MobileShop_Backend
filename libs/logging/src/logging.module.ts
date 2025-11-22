import { DynamicModule, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

interface LogData {
  level: string;
  message: string;
  meta?: {
    stack?: string;
    context?: string;
    [key: string]: any;
  };
}

@Module({})
export class LoggingModule {
  static register(options: { serviceName: string }): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        WinstonModule.forRootAsync({
          useFactory: () => {
            return {
              transports: [
                // 1. Console Transport
                new winston.transports.Console({
                  format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.ms(),
                    winston.format.colorize({ all: true }),
                    winston.format.printf(
                      ({ timestamp, level, message, context, ms }) => {
                        const ts = String(timestamp);
                        const lvl = String(level);
                        const msg = String(message);
                        const msec = String(ms);
                        const scope = context
                          ? String(context as any)
                          : 'Application';

                        return `${ts} [${scope}] ${lvl}: ${msg} ${msec}`;
                      },
                    ),
                  ),
                }),

                // 2. Elastic Transport
                new ElasticsearchTransport({
                  level: 'info',
                  apm: false,
                  clientOpts: {
                    node:
                      process.env.ELASTICSEARCH_HOSTS ||
                      'http://localhost:9200',
                  },
                  indexPrefix: 'mobile-shop-logs',
                  transformer: (logData) => {
                    const data = logData as LogData;
                    const meta = data.meta || {};

                    return {
                      '@timestamp': new Date().toISOString(),
                      severity: data.level,
                      stack: meta.stack ? String(meta.stack) : undefined,
                      message: String(data.message),
                      context: meta.context
                        ? String(meta.context)
                        : 'Application',
                      service: options.serviceName,
                    };
                  },
                }),
              ],
            };
          },
          inject: [],
        }),
      ],
      exports: [WinstonModule],
    };
  }
}
