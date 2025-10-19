import { EventJson } from '../interface';
import { AppEvent } from '../model';

export const EVT_PAYMENT_CREATED = 'PaymentCreated';

export interface BasePaymentEventPayload {
  id: number;
}

export interface PaymentCreatedPayload extends BasePaymentEventPayload {
  paymentMethodId: number;
  orderId: number;
  transactionId: string;
  status: string;
  amount: number;
  payDate?: string;
}

export abstract class PaymentEvent<
  T extends BasePaymentEventPayload,
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

  static fromJson(json: EventJson): PaymentEvent<BasePaymentEventPayload> {
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
      case EVT_PAYMENT_CREATED: {
        const paymentPayload = validatePaymentCreatedPayload(payload);
        return new PaymentCreatedEvent(paymentPayload, {
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

function validatePaymentCreatedPayload(
  payload: Record<string, unknown>,
): PaymentCreatedPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }
  if (typeof payload.paymentMethodId !== 'number') {
    throw new Error('Invalid payload: paymentMethodId must be a number');
  }
  if (typeof payload.orderId !== 'number') {
    throw new Error('Invalid payload: orderId must be a number');
  }
  if (typeof payload.transactionId !== 'string') {
    throw new Error('Invalid payload: transactionId must be a string');
  }
  if (typeof payload.status !== 'string') {
    throw new Error('Invalid payload: status must be a string');
  }
  if (typeof payload.amount !== 'number') {
    throw new Error('Invalid payload: amount must be a number');
  }
  if (payload.payDate && typeof payload.payDate !== 'string') {
    throw new Error('Invalid payload: payDate must be a string');
  }

  return {
    id: payload.id,
    paymentMethodId: payload.paymentMethodId,
    orderId: payload.orderId,
    transactionId: payload.transactionId,
    status: payload.status,
    amount: payload.amount,
    payDate: payload.payDate as string | undefined,
  };
}

export class PaymentCreatedEvent extends PaymentEvent<PaymentCreatedPayload> {
  constructor(
    payload: PaymentCreatedPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_PAYMENT_CREATED, payload, options);
  }

  static create(
    payload: PaymentCreatedPayload,
    senderId: string,
  ): PaymentCreatedEvent {
    return new PaymentCreatedEvent(payload, {
      senderId,
    });
  }

  static from(json: EventJson): PaymentCreatedEvent {
    return PaymentEvent.fromJson(json) as PaymentCreatedEvent;
  }
}
