import { EventJson } from '../interface';
import { AppEvent } from '../model';

export const EVT_PHONE_CREATED = 'PhoneCreated';
export const EVT_VARIANT_CREATED = 'VariantCreated';
export const EVT_BRAND_UPDATED = 'BrandUpdated';
export const EVT_CATEGORY_UPDATED = 'CategoryUpdated';
export const EVT_PHONE_VARIANT_UPDATED = 'PhoneVariantUpdated';
export const EVT_PHONE_UPDATED = 'PhoneUpdated';
export const EVT_INVENTORY_LOW = 'InventoryLow';

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

export interface InventoryLowPayload extends BasePhoneEventPayload {
  variantId: number;
  colorId: number;
  sku: string;
  stockQuantity: number;
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
      case EVT_BRAND_UPDATED: {
        const basePayload = validateBasePhoneEventPayload(payload);
        return new BrandUpdatedEvent(basePayload, {
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
      case EVT_CATEGORY_UPDATED: {
        const basePayload = validateBasePhoneEventPayload(payload);
        return new CategoryUpdatedEvent(basePayload, {
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
      case EVT_PHONE_VARIANT_UPDATED: {
        const basePayload = validateBasePhoneEventPayload(payload);
        return new PhoneVariantUpdatedEvent(basePayload, {
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
      case EVT_PHONE_UPDATED: {
        const basePayload = validateBasePhoneEventPayload(payload);
        return new PhoneUpdatedEvent(basePayload, {
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
      case EVT_INVENTORY_LOW: {
        const inventoryLowPayload = validateInventoryLowPayload(payload);
        return new InventoryLowEvent(inventoryLowPayload, {
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

function validateBasePhoneEventPayload(
  payload: Record<string, unknown>,
): BasePhoneEventPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }

  return {
    id: payload.id,
  };
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

function validateInventoryLowPayload(
  payload: Record<string, unknown>,
): InventoryLowPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }
  if (typeof payload.variantId !== 'number') {
    throw new Error('Invalid payload: variantId must be a number');
  }
  if (typeof payload.colorId !== 'number') {
    throw new Error('Invalid payload: colorId must be a number');
  }
  if (typeof payload.sku !== 'string') {
    throw new Error('Invalid payload: sku must be a string');
  }
  if (typeof payload.stockQuantity !== 'number') {
    throw new Error('Invalid payload: stockQuantity must be a number');
  }

  return {
    id: payload.id,
    variantId: payload.variantId,
    colorId: payload.colorId,
    sku: payload.sku,
    stockQuantity: payload.stockQuantity,
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

export class BrandUpdatedEvent extends PhoneEvent<BasePhoneEventPayload> {
  constructor(
    payload: BasePhoneEventPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_BRAND_UPDATED, payload, options);
  }

  static create(
    payload: BasePhoneEventPayload,
    senderId: string,
  ): BrandUpdatedEvent {
    return new BrandUpdatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): BrandUpdatedEvent {
    return PhoneEvent.fromJson(json) as BrandUpdatedEvent;
  }
}

export class CategoryUpdatedEvent extends PhoneEvent<BasePhoneEventPayload> {
  constructor(
    payload: BasePhoneEventPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_CATEGORY_UPDATED, payload, options);
  }

  static create(
    payload: BasePhoneEventPayload,
    senderId: string,
  ): CategoryUpdatedEvent {
    return new CategoryUpdatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): CategoryUpdatedEvent {
    return PhoneEvent.fromJson(json) as CategoryUpdatedEvent;
  }
}

export class PhoneVariantUpdatedEvent extends PhoneEvent<BasePhoneEventPayload> {
  constructor(
    payload: BasePhoneEventPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_PHONE_VARIANT_UPDATED, payload, options);
  }

  static create(
    payload: BasePhoneEventPayload,
    senderId: string,
  ): PhoneVariantUpdatedEvent {
    return new PhoneVariantUpdatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): PhoneVariantUpdatedEvent {
    return PhoneEvent.fromJson(json) as PhoneVariantUpdatedEvent;
  }
}

export class PhoneUpdatedEvent extends PhoneEvent<BasePhoneEventPayload> {
  constructor(
    payload: BasePhoneEventPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_PHONE_UPDATED, payload, options);
  }

  static create(
    payload: BasePhoneEventPayload,
    senderId: string,
  ): PhoneUpdatedEvent {
    return new PhoneUpdatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): PhoneUpdatedEvent {
    return PhoneEvent.fromJson(json) as PhoneUpdatedEvent;
  }
}

export class InventoryLowEvent extends PhoneEvent<InventoryLowPayload> {
  constructor(
    payload: InventoryLowPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_INVENTORY_LOW, payload, options);
  }

  static create(
    payload: InventoryLowPayload,
    senderId: string,
  ): InventoryLowEvent {
    return new InventoryLowEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): InventoryLowEvent {
    return PhoneEvent.fromJson(json) as InventoryLowEvent;
  }
}
