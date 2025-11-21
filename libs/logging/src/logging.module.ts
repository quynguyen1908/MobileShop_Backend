import { DynamicModule, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

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
                    winston.format.printf(({ timestamp, level, message, context, ms }) => {
                      return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${ms}`;
                    }),
                  ),
                }),

                // 2. Elastic Transport
                new ElasticsearchTransport({
                  level: 'info',
                  clientOpts: {
                    node: process.env.ELASTICSEARCH_HOSTS || 'http://localhost:9200',
                  },
                  indexPrefix: 'mobile-shop-logs',
                  transformer: (logData) => {
                    return {
                      '@timestamp': new Date().toISOString(),
                      severity: logData.level,
                      stack: logData.meta?.stack,
                      message: logData.message,
                      context: logData.meta?.context || 'Application',
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