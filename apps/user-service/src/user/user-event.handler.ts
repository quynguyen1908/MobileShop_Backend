import { EVENT_SUBSCRIBER, USER_SERVICE } from '@app/contracts';
import type { IEventSubscriber } from '@app/contracts';
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { IUserService } from './user.port';
import { EVT_AUTH_REGISTERED, EVT_AUTH_TEST, AuthRegisteredEvent, AuthTestEvent } from '@app/contracts/auth';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class UserEventHandler {
    private readonly logger = new Logger(UserEventHandler.name);

    constructor(
        @Inject(EVENT_SUBSCRIBER) private readonly eventSubscriber: IEventSubscriber,
        @Inject(USER_SERVICE) private readonly userService: IUserService,
        private eventEmitter: EventEmitter2
    ) {
        this.logger.log('UserEventHandler initialized');
        this.eventEmitter.emit('app.ready');
    }

    @OnEvent('app.ready')
    async initSubscriptions() {
        await this.subscribe();
    }

    async handleAuthRegistered(event: AuthRegisteredEvent) {
        this.logger.log(`Handling AuthRegistered event for user ID: ${event.payload.id}`);
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
                    this.logger.warn(`Error parsing dateOfBirth: ${dateError.message}, using undefined`);
                }
            }

            await this.userService.createCustomer({
                userId: event.payload.id,
                firstName: event.payload.firstName,
                lastName: event.payload.lastName,
                dateOfBirth: dateOfBirth
            });

        } catch (error) {
            this.logger.error(`Failed to create customer: ${error.message}`);
        }
    }

    async handleAuthTest(event: AuthTestEvent) {
        this.logger.log(`🎉 Successfully received AuthTest event with ID: ${event.id}`);
        this.logger.log(`Message: ${event.payload.message}`);
        this.logger.log(`Timestamp: ${event.payload.timestamp}`);
        this.logger.log(`From sender: ${event.senderId || 'unknown'}`);
    }

    private async subscribe() {
        this.logger.log('Subscribing to events...');

        await this.eventSubscriber.subscribe(EVT_AUTH_REGISTERED, 'user-service', async (msg: string) => {
            try {
                this.logger.log(`Received ${EVT_AUTH_REGISTERED} event: ${msg}`);
                const data = JSON.parse(msg);
                const event = AuthRegisteredEvent.from(data);
                await this.handleAuthRegistered(event);
            } catch (error) {
                this.logger.error(`Error processing ${EVT_AUTH_REGISTERED} event: ${error.message}`, error.stack);
            }
        });

        await this.eventSubscriber.subscribe(EVT_AUTH_TEST, 'user-service', async (msg: string) => {
            try {
                this.logger.log(`Received ${EVT_AUTH_TEST} event: ${msg}`);
                const data = JSON.parse(msg);
                const event = AuthTestEvent.from(data);
                await this.handleAuthTest(event);
            } catch (error) {
                this.logger.error(`Error processing ${EVT_AUTH_TEST} event: ${error.message}`, error.stack);
            }
        });

        this.logger.log('Successfully subscribed to all events');
    }
}
