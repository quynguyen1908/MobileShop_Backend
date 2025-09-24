import { AppEvent } from "../model";

export const EVT_AUTH_REGISTERED = 'AuthRegistered';
export const EVT_AUTH_TEST = 'AuthTest';

export interface BaseAuthEventPayload {
    id: number;
}

export interface AuthRegisteredPayload extends BaseAuthEventPayload {
    username: string;
    email: string;
    phone: string;
    roleId: number;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | string;
}

export interface AuthTestPayload extends BaseAuthEventPayload {
    message?: string;
    timestamp?: string;
}

export abstract class AuthEvent<T extends BaseAuthEventPayload> extends AppEvent<T> {
    protected constructor(
        eventName: string,
        payload: T,
        options?: {
            id?: string;
            occurredAt?: Date;
            senderId?: string;
            correlationId?: string;
            version?: string;
        }
    ) {
        super(eventName, payload, options);
    }

    static fromJson(json: any): AuthEvent<BaseAuthEventPayload> {
        const { eventName, payload, id, occurredAt, senderId, correlationId, version } = json;

        switch (eventName) {
            case EVT_AUTH_REGISTERED:
                return new AuthRegisteredEvent(payload as AuthRegisteredPayload, {
                    id, occurredAt, senderId, correlationId, version
                });
            case EVT_AUTH_TEST:
                return new AuthTestEvent(payload as AuthTestPayload, {
                    id, occurredAt, senderId, correlationId, version
                });
            default:
                throw new Error(`Unknown event name: ${eventName}`);
        }
    }
}

export class AuthRegisteredEvent extends AuthEvent<AuthRegisteredPayload> {
    constructor(
        payload: AuthRegisteredPayload,
        options?: {
            id?: string;
            occurredAt?: Date;
            senderId?: string;
            correlationId?: string;
            version?: string;
        }
    ) {
        super(EVT_AUTH_REGISTERED, payload, options);
    }

    static create(payload: AuthRegisteredPayload, senderId: string): AuthRegisteredEvent {
        return new AuthRegisteredEvent(payload, { senderId });
    }

    static from(json: any): AuthRegisteredEvent {
        const payload = {...json.payload};
        
        if (payload.dateOfBirth && typeof payload.dateOfBirth === 'string') {
            try {
                payload.dateOfBirth = new Date(payload.dateOfBirth);
            } catch (e) {}
        }
        return AuthEvent.fromJson(json) as AuthRegisteredEvent;
    }
}

export class AuthTestEvent extends AuthEvent<AuthTestPayload> {
    constructor(
        payload: AuthTestPayload,
        options?: {
            id?: string;
            occurredAt?: Date;
            senderId?: string;
            correlationId?: string;
            version?: string;
        }
    ) {
        super(EVT_AUTH_TEST, payload, options);
    }
    static create(payload: AuthTestPayload, senderId: string): AuthTestEvent {
        return new AuthTestEvent(payload, { senderId });
    }
    static from(json: any): AuthTestEvent {
        return AuthEvent.fromJson(json) as AuthTestEvent;
    }
}