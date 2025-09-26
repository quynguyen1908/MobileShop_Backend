import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventHandler, IEventPublisher, IEventSubscriber } from '../interface';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { AppEvent } from '../model';

@Injectable()
export class RabbitMQClient
  implements IEventPublisher, IEventSubscriber, OnModuleInit, OnModuleDestroy
{
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly logger = new Logger(RabbitMQClient.name);
  private readonly exchange = 'events';

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const url = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://guest:guest@localhost:5672',
      );
      this.connection = await amqp.connect(url);

      if (this.connection) {
        this.channel = await this.connection.createChannel();

        if (this.channel) {
          await this.channel.assertExchange(this.exchange, 'topic', {
            durable: true,
          });
          this.logger.log('Connected to RabbitMQ');
        }
      }

      if (this.connection) {
        this.connection.on('close', () => {
          this.logger.warn(
            'RabbitMQ connection closed, attempting to reconnect...',
          );
          void setTimeout(() => void this.connect(), 5000);
        });

        this.connection.on('error', (err: Error) => {
          this.logger.error(`RabbitMQ connection error: ${err.message}`);
          void setTimeout(() => void this.connect(), 5000);
        });
      }
    } catch (error) {
      const typedError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to connect to RabbitMQ: ${typedError.message}`);
      void setTimeout(() => void this.connect(), 5000);
    }
  }

  async publish<T>(event: AppEvent<T>): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Failed to connect to RabbitMQ');
      }

      const message = JSON.stringify(event.plainObject());

      this.logger.log(
        `Publishing event ${event.eventName} with id ${event.id}`,
      );

      this.channel.publish(
        this.exchange,
        event.eventName,
        Buffer.from(message),
        {
          persistent: true,
          messageId: event.id,
          timestamp: event.occurredAt.getTime(),
          headers: {
            'x-correlation-id': event.correlationId,
            'x-version': event.version,
            'x-sender-id': event.senderId,
          },
        },
      );

      this.logger.log(
        `✅ Successfully published event ${event.eventName} to exchange ${this.exchange}`,
      );
    } catch (error) {
      const typedError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `❌ Failed to publish event ${event.eventName}: ${typedError.message}`,
        typedError.stack,
      );
      throw typedError;
    }
  }

  async subscribe(
    topic: string,
    serviceName: string,
    handler: EventHandler,
  ): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Failed to connect to RabbitMQ');
      }

      // Tạo queue cố định theo service và topic
      const queueName = `${serviceName}.${topic}`;
      this.logger.log(`Creating queue: ${queueName} for topic: ${topic}`);

      await this.channel.assertQueue(queueName, {
        durable: true,
        autoDelete: false,
      });

      // Bind queue tới exchange với topic
      this.logger.log(
        `Binding queue ${queueName} to exchange ${this.exchange} with topic ${topic}`,
      );
      await this.channel.bindQueue(queueName, this.exchange, topic);

      // Consume từ queue
      this.logger.log(`Setting up consumer for queue: ${queueName}`);

      const channel = this.channel;
      await channel.consume(queueName, (msg: amqp.ConsumeMessage | null) => {
        if (msg) {
          try {
            const content = msg.content.toString();
            this.logger.log(
              `✉️ Received message on topic ${topic}, queue ${queueName}`,
            );

            handler(content);
            channel.ack(msg);
          } catch (error) {
            const typedError =
              error instanceof Error ? error : new Error(String(error));
            this.logger.error(
              `Error processing message on topic ${topic}: ${typedError.message}`,
              typedError.stack,
            );
            channel.nack(msg, false, true);
          }
        }
      });

      this.logger.log(
        `✅ Successfully subscribed to topic: ${topic} with queue: ${queueName}`,
      );
    } catch (error) {
      const typedError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `❌ Failed to subscribe to topic ${topic}: ${typedError.message}`,
        typedError.stack,
      );
      throw typedError;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log('Disconnected from RabbitMQ server');
    } catch (error) {
      const typedError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error disconnecting: ${typedError.message}`);
    }
  }
}
