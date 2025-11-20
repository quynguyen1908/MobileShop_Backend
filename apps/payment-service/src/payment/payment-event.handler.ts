import { PAYMENT_SERVICE } from '@app/contracts';
import { EVENT_SUBSCRIBER } from '@app/rabbitmq';
import type { EventJson, IEventSubscriber } from '@app/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IPaymentService } from './payment.port';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  EVT_ORDER_CREATED,
  EVT_ORDER_UPDATED,
  OrderCreatedEvent,
  OrderUpdatedEvent,
} from '@app/contracts/order/order.event';
import {
  Payment,
  PAYMENT_SERVICE_NAME,
  PaymentStatus,
  PayMethod,
} from '@app/contracts/payment';
import { OrderStatus } from '@app/contracts/order';

interface TypedError {
  message: string;
  stack?: string;
}

@Injectable()
export class PaymentEventHandler {
  private readonly logger = new Logger(PaymentEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(PAYMENT_SERVICE) private readonly paymentService: IPaymentService,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log('PaymentEventHandler initialized');
    this.eventEmitter.emit('app.ready');
  }

  @OnEvent('app.ready')
  async initSubscriptions(): Promise<void> {
    await this.subscribe();
  }

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderCreatedEvent for orderId: ${event.payload.id}`,
    );
    try {
      if (event.payload.paymentMethod.code === PayMethod.COD.toString()) {
        const transactionId = `${event.payload.orderCode}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const payment: Payment = {
          paymentMethodId: event.payload.paymentMethod.id,
          orderId: event.payload.id,
          transactionId: transactionId,
          status: PaymentStatus.PENDING,
          amount: event.payload.finalAmount,
          isDeleted: false,
        };

        await this.paymentService.createPayment(payment);
      } else {
        this.logger.log(
          `Payment method is not COD for orderId: ${event.payload.id}, skipping payment creation.`,
        );
        return;
      }
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to create payment for orderId: ${event.payload.id} - ${typedError.message}`,
      );
    }
  }

  async handleOrderUpdated(event: OrderUpdatedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderUpdatedEvent for orderId: ${event.payload.id}`,
    );
    try {
      const payments = await this.paymentService.getPaymentsByOrderIds([
        event.payload.id,
      ]);
      if (payments.length === 0) {
        this.logger.log(
          `No payment found for orderId: ${event.payload.id}, skipping update.`,
        );
        return;
      }

      for (const payment of payments) {
        if (
          payment.status === PaymentStatus.PENDING &&
          payment.paymentMethod.code === PayMethod.COD.toString()
        ) {
          switch (event.payload.status) {
            case OrderStatus.DELIVERED.toString(): {
              const now = new Date();
              const pad = (n: number) => n.toString().padStart(2, '0');
              const formatted = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

              await this.paymentService.updatePayment(payment.id!, {
                status: PaymentStatus.COMPLETED,
                payDate: formatted,
                updatedAt: new Date(),
              });
              break;
            }
            case OrderStatus.FAILED.toString(): {
              await this.paymentService.updatePayment(payment.id!, {
                status: PaymentStatus.FAILED,
                updatedAt: new Date(),
              });
              break;
            }
            default: {
              this.logger.log(
                `No payment status update required for orderId: ${event.payload.id} with order status: ${event.payload.status}`,
              );
              break;
            }
          }
        }
      }
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to update payment for orderId: ${event.payload.id} - ${typedError.message}`,
      );
    }
  }

  private async subscribe(): Promise<void> {
    this.logger.log('Subscribing to payment events...');

    await this.eventSubscriber.subscribe(
      EVT_ORDER_CREATED,
      PAYMENT_SERVICE_NAME,
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
      PAYMENT_SERVICE_NAME,
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

    this.logger.log('Successfully subscribed to all payment events.');
  }
}
