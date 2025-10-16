import { AppEvent } from '../model';
import { safeStringify } from '../utils';
import { EventJson } from '../interface';

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

export abstract class AuthEvent<
  T extends BaseAuthEventPayload,
> extends AppEvent<T> {
  protected constructor(
    eventName: string,
    payload: T,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(eventName, payload, options);
  }

  static fromJson(json: EventJson): AuthEvent<BaseAuthEventPayload> {
    const {
      eventName,
      payload,
      id,
      occurredAt,
      senderId,
      correlationId,
      version,
    } = json;

    switch (eventName) {
      case EVT_AUTH_REGISTERED: {
        // Kiểm tra và chuyển đổi payload
        const authPayload = validateAuthRegisteredPayload(payload);
        return new AuthRegisteredEvent(authPayload, {
          id,
          occurredAt:
            occurredAt instanceof Date
              ? occurredAt
              : new Date(String(occurredAt)),
          senderId,
          correlationId,
          version,
        });
      }
      case EVT_AUTH_TEST: {
        // Kiểm tra và chuyển đổi payload
        const testPayload = validateAuthTestPayload(payload);
        return new AuthTestEvent(testPayload, {
          id,
          occurredAt:
            occurredAt instanceof Date
              ? occurredAt
              : new Date(String(occurredAt)),
          senderId,
          correlationId,
          version,
        });
      }
      default:
        throw new Error(`Unknown event name: ${eventName}`);
    }
  }
}

// Hàm kiểm tra payload và đảm bảo nó phù hợp với AuthRegisteredPayload
function validateAuthRegisteredPayload(
  payload: Record<string, unknown>,
): AuthRegisteredPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }

  let username = '';
  if (payload.username !== undefined) {
    if (typeof payload.username === 'string') {
      username = payload.username;
    } else if (payload.username === null) {
      username = '';
    } else {
      username = safeStringify(payload.username);
    }
  }

  let email = '';
  if (payload.email !== undefined) {
    if (typeof payload.email === 'string') {
      email = payload.email;
    } else if (payload.email === null) {
      email = '';
    } else {
      email = safeStringify(payload.email);
    }
  }

  let phone = '';
  if (payload.phone !== undefined) {
    if (typeof payload.phone === 'string') {
      phone = payload.phone;
    } else if (payload.phone === null) {
      phone = '';
    } else {
      phone = safeStringify(payload.phone);
    }
  }

  const roleId =
    typeof payload.roleId === 'number'
      ? payload.roleId
      : Number(payload.roleId || 0);

  let firstName = '';
  if (payload.firstName !== undefined) {
    if (typeof payload.firstName === 'string') {
      firstName = payload.firstName;
    } else if (payload.firstName === null) {
      firstName = '';
    } else {
      firstName = safeStringify(payload.firstName);
    }
  }

  let lastName = '';
  if (payload.lastName !== undefined) {
    if (typeof payload.lastName === 'string') {
      lastName = payload.lastName;
    } else if (payload.lastName === null) {
      lastName = '';
    } else {
      lastName = safeStringify(payload.lastName);
    }
  }

  let dateOfBirth: Date | string;
  if (payload.dateOfBirth instanceof Date) {
    dateOfBirth = payload.dateOfBirth;
  } else if (typeof payload.dateOfBirth === 'string') {
    dateOfBirth = new Date(payload.dateOfBirth);
  } else {
    dateOfBirth = new Date();
  }

  const typedPayload: AuthRegisteredPayload = {
    id: payload.id,
    username,
    email,
    phone,
    roleId,
    firstName,
    lastName,
    dateOfBirth,
  };

  return typedPayload;
}

// Hàm kiểm tra payload và đảm bảo nó phù hợp với AuthTestPayload
function validateAuthTestPayload(
  payload: Record<string, unknown>,
): AuthTestPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }

  let message: string | undefined;
  if (payload.message !== undefined) {
    if (typeof payload.message === 'string') {
      message = payload.message;
    } else if (payload.message === null) {
      message = undefined;
    } else {
      message = safeStringify(payload.message);
    }
  }

  let timestamp: string | undefined;
  if (payload.timestamp !== undefined) {
    if (typeof payload.timestamp === 'string') {
      timestamp = payload.timestamp;
    } else if (payload.timestamp === null) {
      timestamp = undefined;
    } else {
      timestamp = safeStringify(payload.timestamp);
    }
  }

  const typedPayload: AuthTestPayload = {
    id: payload.id,
    message,
    timestamp,
  };

  return typedPayload;
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
    },
  ) {
    super(EVT_AUTH_REGISTERED, payload, options);
  }

  static create(
    payload: AuthRegisteredPayload,
    senderId: string,
  ): AuthRegisteredEvent {
    return new AuthRegisteredEvent(payload, { senderId });
  }

  static from(json: EventJson): AuthRegisteredEvent {
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
    },
  ) {
    super(EVT_AUTH_TEST, payload, options);
  }

  static create(payload: AuthTestPayload, senderId: string): AuthTestEvent {
    return new AuthTestEvent(payload, { senderId });
  }

  static from(json: EventJson): AuthTestEvent {
    return AuthEvent.fromJson(json) as AuthTestEvent;
  }
}
