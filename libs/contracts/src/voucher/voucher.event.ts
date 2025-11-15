import { EventJson } from '../interface';
import { AppEvent } from '../model';

export const EVT_VOUCHER_CREATED = 'VoucherCreated';

export interface BaseVoucherEventPayload {
  id: number;
}

export interface VoucherCreatedPayload extends BaseVoucherEventPayload {
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscountValue: number;
  appliesTo: string;
  categories?: number[];
  paymentMethods?: number;
}

export abstract class VoucherEvent<
  T extends BaseVoucherEventPayload,
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

  static fromJson(json: EventJson): VoucherEvent<BaseVoucherEventPayload> {
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
      case EVT_VOUCHER_CREATED: {
        const voucherPayload = validateVoucherCreatedPayload(payload);
        return new VoucherCreatedEvent(voucherPayload, {
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

function validateVoucherCreatedPayload(
  payload: Record<string, unknown>,
): VoucherCreatedPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }
  if (typeof payload.code !== 'string') {
    throw new Error('Invalid payload: code must be a string');
  }
  if (typeof payload.discountType !== 'string') {
    throw new Error('Invalid payload: discountType must be a string');
  }
  if (typeof payload.discountValue !== 'number') {
    throw new Error('Invalid payload: discountValue must be a number');
  }
  if (typeof payload.maxDiscountValue !== 'number') {
    throw new Error('Invalid payload: maxDiscountValue must be a number');
  }
  if (typeof payload.appliesTo !== 'string') {
    throw new Error('Invalid payload: appliesTo must be a string');
  }

  return {
    id: payload.id,
    code: payload.code,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    maxDiscountValue: payload.maxDiscountValue,
    appliesTo: payload.appliesTo,
    categories: Array.isArray(payload.categories)
      ? payload.categories.map((cat) => Number(cat))
      : undefined,
    paymentMethods:
      typeof payload.paymentMethods === 'number'
        ? payload.paymentMethods
        : undefined,
  };
}

export class VoucherCreatedEvent extends VoucherEvent<VoucherCreatedPayload> {
  constructor(
    payload: VoucherCreatedPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_VOUCHER_CREATED, payload, options);
  }

  static create(
    payload: VoucherCreatedPayload,
    senderId: string,
  ): VoucherCreatedEvent {
    return new VoucherCreatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): VoucherCreatedEvent {
    return VoucherEvent.fromJson(json) as VoucherCreatedEvent;
  }
}
