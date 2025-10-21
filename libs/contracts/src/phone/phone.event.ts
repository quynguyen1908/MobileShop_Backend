import { EventJson } from '../interface';
import { AppEvent } from '../model';

export const EVT_PHONE_CREATED = 'PhoneCreated';
export const EVT_VARIANT_CREATED = 'VariantCreated';

export interface BasePhoneEventPayload {
  id: number;
}

export interface PhoneCreatedPayload extends BasePhoneEventPayload {
  name: string;
  brandId: number;
  categoryId: number;
}

export interface VariantCreatedPayload extends BasePhoneEventPayload {
  phoneId: number;
  variantName: string;
  description?: string;
}

export abstract class PhoneEvent<
  T extends BasePhoneEventPayload,
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

  static fromJson(json: EventJson): PhoneEvent<BasePhoneEventPayload> {
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
      case EVT_PHONE_CREATED: {
        const phonePayload = validatePhoneCreatedPayload(payload);
        return new PhoneCreatedEvent(phonePayload, {
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
      case EVT_VARIANT_CREATED: {
        const variantPayload = validateVariantCreatedPayload(payload);
        return new VariantCreatedEvent(variantPayload, {
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

function validatePhoneCreatedPayload(
  payload: Record<string, unknown>,
): PhoneCreatedPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }
  if (typeof payload.name !== 'string') {
    throw new Error('Invalid payload: name must be a string');
  }
  if (typeof payload.brandId !== 'number') {
    throw new Error('Invalid payload: brandId must be a number');
  }
  if (typeof payload.categoryId !== 'number') {
    throw new Error('Invalid payload: categoryId must be a number');
  }

  return {
    id: payload.id,
    name: payload.name,
    brandId: payload.brandId,
    categoryId: payload.categoryId,
  };
}

function validateVariantCreatedPayload(
  payload: Record<string, unknown>,
): VariantCreatedPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }
  if (typeof payload.phoneId !== 'number') {
    throw new Error('Invalid payload: phoneId must be a number');
  }
  if (typeof payload.variantName !== 'string') {
    throw new Error('Invalid payload: variantName must be a string');
  }

  return {
    id: payload.id,
    phoneId: payload.phoneId,
    variantName: payload.variantName,
    description:
      typeof payload.description === 'string' ? payload.description : undefined,
  };
}

export class PhoneCreatedEvent extends PhoneEvent<PhoneCreatedPayload> {
  constructor(
    payload: PhoneCreatedPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_PHONE_CREATED, payload, options);
  }

  static create(
    payload: PhoneCreatedPayload,
    senderId: string,
  ): PhoneCreatedEvent {
    return new PhoneCreatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): PhoneCreatedEvent {
    return PhoneEvent.fromJson(json) as PhoneCreatedEvent;
  }
}

export class VariantCreatedEvent extends PhoneEvent<VariantCreatedPayload> {
  constructor(
    payload: VariantCreatedPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_VARIANT_CREATED, payload, options);
  }

  static create(
    payload: VariantCreatedPayload,
    senderId: string,
  ): VariantCreatedEvent {
    return new VariantCreatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): VariantCreatedEvent {
    return PhoneEvent.fromJson(json) as VariantCreatedEvent;
  }
}
