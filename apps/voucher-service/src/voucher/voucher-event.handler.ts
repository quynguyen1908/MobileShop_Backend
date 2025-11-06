import { EVENT_SUBSCRIBER, VOUCHER_SERVICE } from '@app/contracts';
import type { EventJson, IEventSubscriber } from '@app/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IVoucherService } from './voucher.port';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  EVT_ORDER_CREATED,
  OrderCreatedEvent,
} from '@app/contracts/order/order.event';
import { VOUCHER_SERVICE_NAME } from '@app/contracts/voucher';

interface TypedError {
  message: string;
  stack?: string;
}

@Injectable()
export class VoucherEventHandler {
  private readonly logger = new Logger(VoucherEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(VOUCHER_SERVICE) private readonly voucherService: IVoucherService,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log('VoucherEventHandler initialized');
    this.eventEmitter.emit('app.ready');
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
      if (event.payload.voucherIds && event.payload.voucherIds.length > 0) {
        await this.voucherService.markVouchersAsUsed(
          event.payload.voucherIds,
          event.payload.id,
          event.payload.customerId,
        );
      }
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(`Failed to update voucher: ${typedError.message}`);
    }
  }

  private async subscribe(): Promise<void> {
    this.logger.log('Subscribing to voucher events...');

    await this.eventSubscriber.subscribe(
      EVT_ORDER_CREATED,
      VOUCHER_SERVICE_NAME,
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

    this.logger.log('Successfully subscribed to all voucher events');
  }
}
