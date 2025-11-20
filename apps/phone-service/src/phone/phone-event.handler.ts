import { PHONE_SERVICE } from '@app/contracts';
import { EVENT_PUBLISHER, EVENT_SUBSCRIBER } from '@app/rabbitmq';
import type {
  EventJson,
  IEventPublisher,
  IEventSubscriber,
} from '@app/contracts';
import {
  EVT_ORDER_CREATED,
  EVT_ORDER_UPDATED,
  OrderCreatedEvent,
  OrderUpdatedEvent,
} from '@app/contracts/order/order.event';
import {
  BrandUpdatedEvent,
  CategoryUpdatedEvent,
  EVT_BRAND_UPDATED,
  EVT_CATEGORY_UPDATED,
  EVT_PHONE_CREATED,
  EVT_PHONE_UPDATED,
  EVT_PHONE_VARIANT_UPDATED,
  EVT_VARIANT_CREATED,
  InventoryLowEvent,
  PHONE_SERVICE_NAME,
  PhoneCreatedEvent,
  PhoneUpdatedEvent,
  PhoneVariantUpdatedEvent,
  VariantCreatedEvent,
} from '@app/contracts/phone';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { IPhoneService } from './phone.port';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { OrderStatus } from '@app/contracts/order';

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
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
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

          if (newStock <= 10) {
            const event = InventoryLowEvent.create(
              {
                id: inventories.id,
                variantId: variantId,
                colorId: colorId,
                sku: inventories.sku,
                stockQuantity: newStock,
              },
              PHONE_SERVICE_NAME,
            );

            await this.eventPublisher.publish(event);

            this.logger.warn(
              `Inventory low for variant ID: ${variantId}, color ID: ${colorId}, stock left: ${newStock}. Emitting InventoryLowEvent.`,
            );
          }
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

  async handleOrderUpdated(event: OrderUpdatedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderUpdated event for order ID: ${event.payload.id}`,
    );
    try {
      const items = event.payload.items;
      const status = event.payload.status;

      switch (status) {
        case OrderStatus.CANCELED.toString(): {
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
              const newStock = inventories.stockQuantity + quantity;
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
          break;
        }
        default:
          this.logger.log(`No action required for order status: ${status}`);
          break;
      }
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to process OrderUpdated event: ${typedError.message}`,
      );
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

  async handleBrandUpdated(event: BrandUpdatedEvent): Promise<void> {
    this.logger.log(
      `Handling BrandUpdated event for brand ID: ${event.payload.id}`,
    );
    try {
      await this.ingest();
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to process BrandUpdated event: ${typedError.message}`,
      );
    }
  }

  async handleCategoryUpdated(event: CategoryUpdatedEvent): Promise<void> {
    this.logger.log(
      `Handling CategoryUpdated event for category ID: ${event.payload.id}`,
    );
    try {
      await this.ingest();
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to process CategoryUpdated event: ${typedError.message}`,
      );
    }
  }

  async handlePhoneUpdated(event: PhoneUpdatedEvent): Promise<void> {
    this.logger.log(
      `Handling PhoneUpdated event for phone ID: ${event.payload.id}`,
    );
    try {
      await this.ingest();
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to process PhoneUpdated event: ${typedError.message}`,
      );
    }
  }

  async handlePhoneVariantUpdated(
    event: PhoneVariantUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Handling PhoneVariantUpdated event for variant ID: ${event.payload.id}`,
    );
    try {
      await this.ingest();
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to process PhoneVariantUpdated event: ${typedError.message}`,
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
      EVT_ORDER_UPDATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_ORDER_UPDATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_ORDER_UPDATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = OrderUpdatedEvent.from(eventJson);
            await this.handleOrderUpdated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_ORDER_UPDATED} event: ${typedError.message}`,
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

    await this.eventSubscriber.subscribe(
      EVT_BRAND_UPDATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_BRAND_UPDATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_BRAND_UPDATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = BrandUpdatedEvent.from(eventJson);
            await this.handleBrandUpdated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_BRAND_UPDATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_CATEGORY_UPDATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_CATEGORY_UPDATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_CATEGORY_UPDATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = CategoryUpdatedEvent.from(eventJson);
            await this.handleCategoryUpdated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_CATEGORY_UPDATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_PHONE_UPDATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_PHONE_UPDATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_PHONE_UPDATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = PhoneUpdatedEvent.from(eventJson);
            await this.handlePhoneUpdated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_PHONE_UPDATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_PHONE_VARIANT_UPDATED,
      PHONE_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(
              `Received ${EVT_PHONE_VARIANT_UPDATED} event: ${msg}`,
            );
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_PHONE_VARIANT_UPDATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = PhoneVariantUpdatedEvent.from(eventJson);
            await this.handlePhoneVariantUpdated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_PHONE_VARIANT_UPDATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    this.logger.log('Successfully subscribed to all phone events');
  }
}
