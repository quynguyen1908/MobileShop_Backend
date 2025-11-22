import { ORDER_SERVICE } from '@app/contracts';
import { EVENT_SUBSCRIBER } from '@app/rabbitmq';
import type { EventJson, IEventSubscriber } from '@app/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IOrderService } from './order.port';
import { EventEmitter2 } from 'eventemitter2';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVT_PAYMENT_CREATED,
  PaymentCreatedEvent,
} from '@app/contracts/payment';
import { ORDER_SERVICE_NAME, OrderStatus } from '@app/contracts/order';

interface TypedError {
  message: string;
  stack?: string;
}

@Injectable()
export class OrderEventHandler {
  private readonly logger = new Logger(OrderEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(ORDER_SERVICE) private readonly orderService: IOrderService,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log('OrderEventHandler initialized');
    this.eventEmitter.emit('app.ready');
  }

  @OnEvent('app.ready')
  async initSubscriptions(): Promise<void> {
    await this.subscribe();
  }

  async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling PaymentCreated event for payment ID: ${event.payload.id}`,
    );
    try {
      const order = await this.orderService.getOrderById(event.payload.orderId);
      if (!order) {
        this.logger.warn(`Order with ID ${event.payload.orderId} not found`);
        return;
      }

      if (order.status === OrderStatus.PAID) {
        this.logger.log(
          `Order with ID ${event.payload.orderId} is already marked as PAID`,
        );
        return;
      }

      await this.orderService.updateOrderStatus(
        event.payload.orderId,
        OrderStatus.PAID,
        'Đã thanh toán',
      );
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Error handling PaymentCreated event for payment ID: ${event.payload.id} - ${typedError.message}`,
        typedError.stack,
      );
    }
  }

  private async subscribe(): Promise<void> {
    this.logger.log('Subscribing to order events...');

    await this.eventSubscriber.subscribe(
      EVT_PAYMENT_CREATED,
      ORDER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_PAYMENT_CREATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_PAYMENT_CREATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = PaymentCreatedEvent.from(eventJson);
            await this.handlePaymentCreated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_PAYMENT_CREATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    this.logger.log('Successfully subscribed to all order events');
  }
}
