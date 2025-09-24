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
            
            this.logger.log(`Publishing event ${event.eventName} with id ${event.id}`);

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
            
            this.logger.log(`✅ Successfully published event ${event.eventName} to exchange ${this.exchange}`);
        } catch (error) {
            this.logger.error(`❌ Failed to publish event ${event.eventName}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async subscribe(topic: string, serviceName: string, handler: EventHandler): Promise<void> {
        try {
            if (!this.channel) {
                await this.connect();
            }
            
            // Tạo queue cố định theo service và topic
            const queueName = `${serviceName}.${topic}`;
            this.logger.log(`Creating queue: ${queueName} for topic: ${topic}`);

            await this.channel.assertQueue(queueName, {
                durable: true,
                autoDelete: false, 
            });
            
            // Bind queue tới exchange với topic
            this.logger.log(`Binding queue ${queueName} to exchange ${this.exchange} with topic ${topic}`);
            await this.channel.bindQueue(queueName, this.exchange, topic);

            // Consume từ queue
            this.logger.log(`Setting up consumer for queue: ${queueName}`);
            await this.channel.consume(queueName, async (msg: ConsumeMessage | null) => {
                if (msg) {
                    try {
                        const content = msg.content.toString();
                        this.logger.log(`✉️ Received message on topic ${topic}, queue ${queueName}`);
                        
                        await handler(content);
                        this.channel.ack(msg);
                    } catch (error) {
                        this.logger.error(`Error processing message on topic ${topic}: ${error.message}`, error.stack);
                        this.channel.nack(msg, false, true);
                    }
                }
            });
            
            this.logger.log(`✅ Successfully subscribed to topic: ${topic} with queue: ${queueName}`);
        } catch (error) {
            this.logger.error(`❌ Failed to subscribe to topic ${topic}: ${error.message}`, error.stack);
            throw error;
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