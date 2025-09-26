import { EVENT_SUBSCRIBER, USER_SERVICE } from '@app/contracts';
import type { IEventSubscriber } from '@app/contracts';
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { IUserService } from './user.port';
import {
  EVT_AUTH_REGISTERED,
  EVT_AUTH_TEST,
  AuthRegisteredEvent,
  AuthTestEvent,
  AuthEventJson,
} from '@app/contracts/auth';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

interface TypedError {
  message: string;
  stack?: string;
}

interface EventData {
  eventName: string;
  payload: Record<string, unknown>;
  id?: string;
  occurredAt?: string | Date;
  senderId?: string;
  correlationId?: string;
  version?: string;
}

@Injectable()
export class UserEventHandler {
  private readonly logger = new Logger(UserEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(USER_SERVICE) private readonly userService: IUserService,
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

  handleAuthTest(event: AuthTestEvent): void {
    this.logger.log(
      `🎉 Successfully received AuthTest event with ID: ${event.id}`,
    );
    this.logger.log(`Message: ${event.payload.message}`);
    this.logger.log(`Timestamp: ${event.payload.timestamp}`);
    this.logger.log(`From sender: ${event.senderId || 'unknown'}`);
  }

  private async subscribe(): Promise<void> {
    this.logger.log('Subscribing to events...');

    await this.eventSubscriber.subscribe(
      EVT_AUTH_REGISTERED,
      'user-service',
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_AUTH_REGISTERED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as unknown;
            if (!this.isEventData(parsedData)) {
              throw new Error('Invalid event data format');
            }

            const data: EventData = parsedData;

            const eventJson: AuthEventJson = {
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
      'user-service',
      (msg: string): void => {
        try {
          this.logger.log(`Received ${EVT_AUTH_TEST} event: ${msg}`);
          const parsedData = JSON.parse(msg) as unknown;
          if (!this.isEventData(parsedData)) {
            throw new Error('Invalid event data format');
          }

          const data: EventData = parsedData;

          const eventJson: AuthEventJson = {
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

    this.logger.log('Successfully subscribed to all events');
  }

  private isEventData(data: unknown): data is EventData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Partial<EventData>;

    return (
      obj.eventName !== undefined &&
      typeof obj.eventName === 'string' &&
      obj.payload !== undefined &&
      typeof obj.payload === 'object'
    );
  }
}
