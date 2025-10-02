import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '.prisma/client/phone';

type LogLevel = 'info' | 'query' | 'warn' | 'error';
type LogDefinition = {
  level: LogLevel;
  emit: 'stdout' | 'event';
};
type PrismaClientOptions = {
  log?: (LogLevel | LogDefinition)[];
};

interface TypedPrismaClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

@Injectable()
export class PhonePrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: [
        { level: 'query', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    } as PrismaClientOptions);
  }

  async onModuleInit(): Promise<void> {
    const client = this as unknown as TypedPrismaClient;
    await client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    const client = this as unknown as TypedPrismaClient;
    await client.$disconnect();
  }
}
