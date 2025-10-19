import { EVENT_SUBSCRIBER, ORDER_SERVICE, USER_SERVICE } from '@app/contracts';
import type { IEventSubscriber } from '@app/contracts';
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { IUserService } from './user.port';
import {
  EVT_AUTH_REGISTERED,
  EVT_AUTH_TEST,
  AuthRegisteredEvent,
  AuthTestEvent,
} from '@app/contracts/auth';
import { EventJson } from '@app/contracts';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { USER_SERVICE_NAME } from '@app/contracts/user';
import {
  EVT_ORDER_CREATED,
  OrderCreatedEvent,
} from '@app/contracts/order/order.event';
import {
  Order,
  ORDER_PATTERN,
  PointConfig,
  PointType,
} from '@app/contracts/order';
import {
  EVT_PAYMENT_CREATED,
  PaymentCreatedEvent,
  PaymentStatus,
} from '@app/contracts/payment';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

interface TypedError {
  message: string;
  stack?: string;
}

@Injectable()
export class UserEventHandler {
  private readonly logger = new Logger(UserEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(USER_SERVICE) private readonly userService: IUserService,
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log('UserEventHandler initialized');
    this.eventEmitter.emit('app.ready');
  }

  @OnEvent('app.ready')
  async initSubscriptions(): Promise<void> {
    await this.subscribe();
  }

  async handleAuthRegistered(event: AuthRegisteredEvent): Promise<void> {
    this.logger.log(
      `Handling AuthRegistered event for user ID: ${event.payload.id}`,
    );
    try {
      let dateOfBirth: Date = new Date('1900-01-01T00:00:00Z');

      if (event.payload.dateOfBirth) {
        try {
          if (event.payload.dateOfBirth instanceof Date) {
            dateOfBirth = event.payload.dateOfBirth;
          } else {
            const parsedDate = new Date(event.payload.dateOfBirth);
            if (!isNaN(parsedDate.getTime())) {
              dateOfBirth = parsedDate;
            }
          }
        } catch (dateError) {
          const typedError = dateError as TypedError;
          this.logger.warn(
            `Error parsing dateOfBirth: ${typedError.message}, using undefined`,
          );
        }
      }

      await this.userService.createCustomer({
        userId: event.payload.id,
        firstName: event.payload.firstName,
        lastName: event.payload.lastName,
        dateOfBirth: dateOfBirth,
      });
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(`Failed to create customer: ${typedError.message}`);
    }
  }

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderCreated event for order ID: ${event.payload.id}`,
    );
    try {
      const pointTransactions = event.payload.pointTransactions;

      const customerId = event.payload.customerId;
      if (!customerId) {
        this.logger.log(
          'No customerId associated with this order, skipping point update',
        );
        return;
      }

      if (!pointTransactions || pointTransactions.length === 0) {
        this.logger.log(
          'No point transactions associated with this order, skipping point update',
        );
        return;
      }

      const customer = await this.userService.getCustomerById(customerId);
      if (!customer) {
        this.logger.log(
          `Customer with ID ${customerId} not found, skipping point update`,
        );
        return;
      }

      let usedPoints = 0;
      for (const transaction of pointTransactions) {
        if (transaction.type === PointType.REDEEM) {
          usedPoints += transaction.points;
        }
      }

      const newPointsBalance = customer.pointsBalance - usedPoints;

      await this.userService.updateCustomer(customerId, {
        pointsBalance: newPointsBalance,
        updatedAt: new Date(),
      });
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to update customer points: ${typedError.message}`,
      );
    }
  }

  async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling PaymentCreated event for payment ID: ${event.payload.id}`,
    );
    try {
      const order = await firstValueFrom<Order>(
        this.orderServiceClient.send(
          ORDER_PATTERN.GET_ORDER_BY_ID,
          event.payload.orderId,
        ),
      );

      if (!order) {
        this.logger.log(
          `Order with ID ${event.payload.orderId} not found, skipping user update`,
        );
        return;
      }

      const customerId = order.customerId;
      if (!customerId) {
        this.logger.log(
          'No customerId associated with this order, skipping user update',
        );
        return;
      }

      const customer = await this.userService.getCustomerById(customerId);
      if (!customer) {
        this.logger.log(
          `Customer with ID ${customerId} not found, skipping user update`,
        );
        return;
      }

      const paymentStatus = event.payload.status;
      if (paymentStatus !== PaymentStatus.COMPLETED.toString()) {
        this.logger.log(
          `Payment status is ${paymentStatus}, not updating points`,
        );
        return;
      }

      const pointConfig = await firstValueFrom<PointConfig>(
        this.orderServiceClient.send(ORDER_PATTERN.GET_POINT_CONFIG, {}),
      );

      if (!pointConfig) {
        this.logger.log('Point configuration not found, skipping point update');
        return;
      }

      const pointsEarned = Math.floor(
        event.payload.amount / pointConfig.earnRate,
      );

      const newPointsBalance = customer.pointsBalance + pointsEarned;

      await this.userService.updateCustomer(customerId, {
        pointsBalance: newPointsBalance,
        updatedAt: new Date(),
      });
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to update customer after payment: ${typedError.message}`,
      );
    }
  }

  handleAuthTest(event: AuthTestEvent): void {
    this.logger.log(
      `🎉 Successfully received AuthTest event with ID: ${event.id}`,
    );
    this.logger.log(`Message: ${event.payload.message}`);
    this.logger.log(`Timestamp: ${event.payload.timestamp}`);
    this.logger.log(`From sender: ${event.senderId || 'unknown'}`);
  }

  private async subscribe(): Promise<void> {
    this.logger.log('Subscribing to user events...');

    await this.eventSubscriber.subscribe(
      EVT_AUTH_REGISTERED,
      USER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_AUTH_REGISTERED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as unknown;
            if (!this.isEventData(parsedData)) {
              throw new Error('Invalid event data format');
            }

            const data: EventJson = parsedData;

            const eventJson: EventJson = {
              eventName: EVT_AUTH_REGISTERED,
              payload: data.payload || {},
              id: data.id,
              occurredAt: data.occurredAt,
              senderId: data.senderId,
              correlationId: data.correlationId,
              version: data.version,
            };
            const event = AuthRegisteredEvent.from(eventJson);
            await this.handleAuthRegistered(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_AUTH_REGISTERED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_AUTH_TEST,
      USER_SERVICE_NAME,
      (msg: string): void => {
        try {
          this.logger.log(`Received ${EVT_AUTH_TEST} event: ${msg}`);
          const parsedData = JSON.parse(msg) as unknown;
          if (!this.isEventData(parsedData)) {
            throw new Error('Invalid event data format');
          }

          const data: EventJson = parsedData;

          const eventJson: EventJson = {
            eventName: EVT_AUTH_TEST,
            payload: data.payload || {},
            id: data.id,
            occurredAt: data.occurredAt,
            senderId: data.senderId,
            correlationId: data.correlationId,
            version: data.version,
          };
          const event = AuthTestEvent.from(eventJson);
          this.handleAuthTest(event);
        } catch (error) {
          const typedError = error as TypedError;
          this.logger.error(
            `Error processing ${EVT_AUTH_TEST} event: ${typedError.message}`,
            typedError.stack,
          );
        }
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_ORDER_CREATED,
      USER_SERVICE_NAME,
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
      EVT_PAYMENT_CREATED,
      USER_SERVICE_NAME,
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

    this.logger.log('Successfully subscribed to all user events');
  }

  private isEventData(data: unknown): data is EventJson {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Partial<EventJson>;

    return (
      obj.eventName !== undefined &&
      typeof obj.eventName === 'string' &&
      obj.payload !== undefined &&
      typeof obj.payload === 'object'
    );
  }
}
