import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventHandler, IEventPublisher, IEventSubscriber } from "../interface";
import { Channel, ConsumeMessage, connect } from "amqplib";
import { ConfigService } from "@nestjs/config/dist/config.service";
import { AppEvent } from "../model";

@Injectable()
export class RabbitMQClient implements IEventPublisher, IEventSubscriber, OnModuleInit, OnModuleDestroy {
    private connection: any;
    private channel: Channel;
    private readonly logger = new Logger(RabbitMQClient.name);
    private readonly exchange = 'events';

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        try {
            const url = this.configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
            this.connection = await connect(url);
            this.channel = await this.connection.createChannel();

            await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
            this.logger.log('Connected to RabbitMQ');

            this.connection.on('close', () => {
                this.logger.warn('RabbitMQ connection closed, attempting to reconnect...');
                setTimeout(() => this.connect(), 5000);
            });

            this.connection.on('error', (err) => {
                this.logger.error(`RabbitMQ connection error: ${err.message}`);
                setTimeout(() => this.connect(), 5000);
            }); 
        } catch (error) {
            this.logger.error(`Failed to connect to RabbitMQ: ${(error as Error).message}`);
            setTimeout(() => this.connect(), 5000);
        }
    }

    async publish<T>(event: AppEvent<T>): Promise<void> {
        try {
            if (!this.channel) {
                await this.connect();
            }
            
            const message = JSON.stringify(event.plainObject());
            
            await this.channel.publish(
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
                    }
                }
            );
            
            this.logger.debug(`Published event ${event.eventName} with id ${event.id}`);
        } catch (error) {
            this.logger.error(`Failed to publish event: ${(error as Error).message}`);
            throw error;
        }
    }

    async subscribe(topic: string, handler: EventHandler): Promise<void> {
        try {
            if (!this.channel) {
                await this.connect();
            }
            
            // Create temporary queue
            const { queue } = await this.channel.assertQueue('', { 
                exclusive: true,
                autoDelete: true 
            });
            
            // Bind queue to exchange with topic
            await this.channel.bindQueue(queue, this.exchange, topic);
            
            // Consume from queue
            await this.channel.consume(queue, async (msg: ConsumeMessage | null) => {
                if (msg) {
                    try {
                        const content = msg.content.toString();
                        await handler(content);
                        this.channel.ack(msg);
                    } catch (error) {
                        this.logger.error(`Error processing message: ${(error as Error).message}`);
                        // Requeue message if needed
                        this.channel.nack(msg, false, true);
                    }
                }
            });
            
            this.logger.log(`Subscribed to topic: ${topic}`);
        } catch (error) {
            this.logger.error(`Failed to subscribe: ${(error as Error).message}`);
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.logger.log('Disconnected from RabbitMQ server');
        } catch (error) {
            this.logger.error(`Error disconnecting: ${(error as Error).message}`);
        }
    }
}