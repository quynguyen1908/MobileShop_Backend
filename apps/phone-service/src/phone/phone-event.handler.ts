import { EVENT_SUBSCRIBER, PHONE_SERVICE } from '@app/contracts';
import type { EventJson, IEventSubscriber } from '@app/contracts';
import {
  EVT_ORDER_CREATED,
  OrderCreatedEvent,
} from '@app/contracts/order/order.event';
import {
  EVT_PHONE_CREATED,
  EVT_VARIANT_CREATED,
  PHONE_SERVICE_NAME,
  PhoneCreatedEvent,
  VariantCreatedEvent,
} from '@app/contracts/phone';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { IPhoneService } from './phone.port';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';

interface TypedError {
  message: string;
  stack?: string;
}

interface IngestResponse {
  success: boolean;
  timestamp: string;
}

@Injectable()
export class PhoneEventHandler {
  private readonly logger = new Logger(PhoneEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(PHONE_SERVICE) private readonly phoneService: IPhoneService,
    private eventEmitter: EventEmitter2,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('PhoneEventHandler initialized');
    this.eventEmitter.emit('app.ready');
  }

  private get aiServiceUrl(): string {
    return this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:4000/api/v1/ai',
    );
  }

  @OnEvent('app.ready')
  async initSubscriptions(): Promise<void> {
    await this.subscribe();
  }

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderCreated event for order ID: ${event.payload.id}`,
    );
    try {
      const items = event.payload.items;
      for (const item of items) {
        const variantId = item.variantId;
        const colorId = item.colorId;
        const quantity = item.quantity;
        const inventories =
          await this.phoneService.getInventoryByVariantIdAndColorId(
            variantId,
            colorId,
          );
        if (inventories && inventories.id !== undefined) {
          const newStock = inventories.stockQuantity - quantity;
          await this.phoneService.updateInventory(inventories.id, {
            stockQuantity: newStock,
            updatedAt: new Date(),
          });
        } else {
          this.logger.warn(
            `No inventory found for variant ID: ${variantId} and color ID: ${colorId}`,
          );
        }
      }
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(`Failed to update phone stock: ${typedError.message}`);
    }
  }

  async handlePhoneCreated(event: PhoneCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling PhoneCreated event for phone ID: ${event.payload.id}`,
    );
    try {
      await this.ingest();
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to process PhoneCreated event: ${typedError.message}`,
      );
    }
  }

  async handleVariantCreated(event: VariantCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling VariantCreated event for variant ID: ${event.payload.id}`,
    );
    try {
      await this.ingest();
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to process VariantCreated event: ${typedError.message}`,
      );
    }
  }

  private async ingest(): Promise<void> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<IngestResponse>(`${this.aiServiceUrl}/etl/ingest`)
        .pipe(
          catchError((error: unknown) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(`ETL Ingestion failed: ${errorMessage}`);
            throw error;
          }),
        ),
    );
    this.logger.log(
      `ETL Ingestion started successfully: ${JSON.stringify(data)}`,
    );
  }

  private async subscribe(): Promise<void> {
    this.logger.log('Subscribing to phone events...');

    await this.eventSubscriber.subscribe(
      EVT_ORDER_CREATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_ORDER_CREATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_ORDER_CREATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = OrderCreatedEvent.from(eventJson);
            await this.handleOrderCreated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_ORDER_CREATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_PHONE_CREATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_PHONE_CREATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_PHONE_CREATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = PhoneCreatedEvent.from(eventJson);
            await this.handlePhoneCreated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_PHONE_CREATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_VARIANT_CREATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_VARIANT_CREATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_VARIANT_CREATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = VariantCreatedEvent.from(eventJson);
            await this.handleVariantCreated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_VARIANT_CREATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    this.logger.log('Successfully subscribed to all phone events');
  }
}
