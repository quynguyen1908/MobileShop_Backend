import { EVENT_SUBSCRIBER, USER_SERVICE } from '@app/contracts';
import type { IEventSubscriber } from '@app/contracts';
import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import type { IUserService } from './user.port';
import { EVT_AUTH_REGISTERED, AuthRegisteredEvent } from '@app/contracts/auth';

@Injectable()
export class UserEventHandler implements OnModuleInit {
    private readonly logger = new Logger(UserEventHandler.name);

    constructor(
        @Inject(EVENT_SUBSCRIBER) private readonly eventSubscriber: IEventSubscriber,
        @Inject(USER_SERVICE) private readonly userService: IUserService,
    ) {}

    async onModuleInit() {
        await this.subscribe();
    }

    async handleAuthRegistered(event: AuthRegisteredEvent) {
        this.logger.log(`Handling AuthRegistered event for user ID: ${event.payload.id}`);
        this.userService.createCustomer({
            userId: event.payload.id,
            firstName: event.payload.firstName,
            lastName: event.payload.lastName,
            dateOfBirth: event.payload.dateOfBirth
        });
    }

    private async subscribe() {
        this.eventSubscriber.subscribe(EVT_AUTH_REGISTERED, (msg: string) => {
            const data = JSON.parse(msg);
            const event = AuthRegisteredEvent.from(data);
            this.handleAuthRegistered(event);
        });
    }
}
