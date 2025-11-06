import { EventJson } from '../interface';
import { AppEvent } from '../model';
import { PointType } from './order.model';

export const EVT_ORDER_CREATED = 'OrderCreated';
export const EVT_ORDER_UPDATED = 'OrderUpdated';

export interface BaseOrderEventPayload {
  id: number;
}

interface OrderItem {
  orderId: number;
  variantId: number;
  quantity: number;
  price: number;
  discount: number;
  colorId: number;
}

interface PointTransaction {
  customerId: number;
  orderId: number;
  type: PointType;
  points: number;
  moneyValue: number;
  isDeleted: boolean;
}

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
}

export interface OrderCreatedPayload extends BaseOrderEventPayload {
  customerId: number;
  orderCode: string;
  orderDate: Date;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  recipientName: string;
  recipientPhone: string;
  status: string;
  street: string;
  communeId: number;
  provinceId: number;
  postalCode: string | null;
  items: OrderItem[];
  pointTransactions: PointTransaction[];
  paymentMethod: PaymentMethod;
  voucherIds?: number[];
}

export interface OrderUpdatedPayload extends BaseOrderEventPayload {
  customerId: number;
  orderCode: string;
  status: string;
  items: OrderItem[];
  pointTransactions: PointTransaction[];
  isCodPaid?: boolean;
}

export abstract class OrderEvent<
  T extends BaseOrderEventPayload,
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

  static fromJson(json: EventJson): OrderEvent<BaseOrderEventPayload> {
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
      case EVT_ORDER_CREATED: {
        // Kiểm tra và chuyển đổi payload
        const orderPayload = validateOrderCreatedPayload(payload);
        return new OrderCreatedEvent(orderPayload, {
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
      case EVT_ORDER_UPDATED: {
        const orderPayload = validateOrderUpdatedPayload(payload);
        return new OrderUpdatedEvent(orderPayload, {
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

function validateOrderCreatedPayload(
  payload: Record<string, unknown>,
): OrderCreatedPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }

  const requiredFields = [
    'id',
    'customerId',
    'orderCode',
    'orderDate',
    'totalAmount',
    'finalAmount',
    'recipientName',
    'recipientPhone',
    'status',
    'street',
    'communeId',
    'provinceId',
    'items',
  ];

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (typeof payload.id !== 'number') {
    throw new Error('id must be a number');
  }

  if (typeof payload.customerId !== 'number') {
    throw new Error('customerId must be a number');
  }

  if (typeof payload.orderCode !== 'string') {
    throw new Error('orderCode must be a string');
  }

  let orderDate: Date;
  if (payload.orderDate instanceof Date) {
    orderDate = payload.orderDate;
  } else if (typeof payload.orderDate === 'string') {
    orderDate = new Date(payload.orderDate);
    if (isNaN(orderDate.getTime())) {
      throw new Error('orderDate must be a valid date string');
    }
  } else {
    throw new Error('orderDate must be a Date or date string');
  }

  const numberFields = [
    'totalAmount',
    'discountAmount',
    'shippingFee',
    'finalAmount',
    'communeId',
    'provinceId',
  ];
  for (const field of numberFields) {
    if (
      payload[field] !== undefined &&
      payload[field] !== null &&
      typeof payload[field] !== 'number'
    ) {
      throw new Error(`${field} must be a number`);
    }
  }

  const stringFields = ['recipientName', 'recipientPhone', 'status', 'street'];
  for (const field of stringFields) {
    if (typeof payload[field] !== 'string') {
      throw new Error(`${field} must be a string`);
    }
  }

  if (
    payload.postalCode !== undefined &&
    payload.postalCode !== null &&
    typeof payload.postalCode !== 'string'
  ) {
    throw new Error('postalCode must be a string or null');
  }

  if (!Array.isArray(payload.items)) {
    throw new Error('items must be an array');
  }

  const items = payload.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Each item must be an object');
    }

    const typedItem = item as Record<string, unknown>;

    if (typeof typedItem.colorId !== 'number') {
      throw new Error('item.colorId must be a number');
    }
    if (typeof typedItem.orderId !== 'number') {
      throw new Error('item.orderId must be a number');
    }
    if (typeof typedItem.variantId !== 'number') {
      throw new Error('item.variantId must be a number');
    }
    if (typeof typedItem.quantity !== 'number') {
      throw new Error('item.quantity must be a number');
    }
    if (typeof typedItem.price !== 'number') {
      throw new Error('item.price must be a number');
    }

    return {
      orderId: typedItem.orderId,
      variantId: typedItem.variantId,
      quantity: typedItem.quantity,
      price: typedItem.price,
      discount: typedItem.discount as number,
      colorId: typedItem.colorId,
    };
  });

  let pointTransactions: PointTransaction[] = [];
  let paymentMethod: PaymentMethod | undefined;

  if (payload.pointTransactions !== undefined) {
    if (!Array.isArray(payload.pointTransactions)) {
      throw new Error('pointTransactions must be an array');
    }

    pointTransactions = payload.pointTransactions.map(
      (transaction: unknown) => {
        if (!transaction || typeof transaction !== 'object') {
          throw new Error('Each pointTransaction must be an object');
        }

        const typedTransaction = transaction as Record<string, unknown>;

        if (typeof typedTransaction.orderId !== 'number') {
          throw new Error('pointTransaction.orderId must be a number');
        }
        if (typeof typedTransaction.customerId !== 'number') {
          throw new Error('pointTransaction.customerId must be a number');
        }
        if (typeof typedTransaction.points !== 'number') {
          throw new Error('pointTransaction.points must be a number');
        }
        if (typeof typedTransaction.moneyValue !== 'number') {
          throw new Error('pointTransaction.moneyValue must be a number');
        }
        if (typeof typedTransaction.isDeleted !== 'boolean') {
          throw new Error('pointTransaction.isDeleted must be a boolean');
        }

        return {
          orderId: typedTransaction.orderId,
          customerId: typedTransaction.customerId,
          type: typedTransaction.type as PointType,
          points: typedTransaction.points,
          moneyValue: typedTransaction.moneyValue,
          isDeleted: typedTransaction.isDeleted,
        };
      },
    );

    if (payload.paymentMethod !== undefined) {
      if (!payload.paymentMethod || typeof payload.paymentMethod !== 'object') {
        throw new Error('paymentMethod must be an object');
      }

      const typedPaymentMethod = payload.paymentMethod as Record<
        string,
        unknown
      >;

      if (typeof typedPaymentMethod.id !== 'number') {
        throw new Error('paymentMethod.id must be a number');
      }
      if (typeof typedPaymentMethod.code !== 'string') {
        throw new Error('paymentMethod.code must be a string');
      }
      if (typeof typedPaymentMethod.name !== 'string') {
        throw new Error('paymentMethod.name must be a string');
      }

      paymentMethod = {
        id: typedPaymentMethod.id,
        code: typedPaymentMethod.code,
        name: typedPaymentMethod.name,
      };
    }
  }

  return {
    id: payload.id,
    customerId: payload.customerId,
    orderCode: payload.orderCode,
    orderDate,
    totalAmount: payload.totalAmount as number,
    discountAmount: (payload.discountAmount as number) || 0,
    shippingFee: (payload.shippingFee as number) || 0,
    finalAmount: payload.finalAmount as number,
    recipientName: payload.recipientName as string,
    recipientPhone: payload.recipientPhone as string,
    status: payload.status as string,
    street: payload.street as string,
    communeId: payload.communeId as number,
    provinceId: payload.provinceId as number,
    postalCode: payload.postalCode as string | null,
    items,
    pointTransactions,
    paymentMethod: paymentMethod as PaymentMethod,
    voucherIds: payload.voucherIds as number[] | undefined,
  };
}

function validateOrderUpdatedPayload(
  payload: Record<string, unknown>,
): OrderUpdatedPayload {
  if (typeof payload.id !== 'number') {
    throw new Error('Invalid payload: id must be a number');
  }

  const requiredFields = [
    'id',
    'customerId',
    'orderCode',
    'status',
    'items',
    'pointTransactions',
  ];

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (typeof payload.id !== 'number') {
    throw new Error('id must be a number');
  }

  if (typeof payload.customerId !== 'number') {
    throw new Error('customerId must be a number');
  }

  if (typeof payload.orderCode !== 'string') {
    throw new Error('orderCode must be a string');
  }

  if (typeof payload.status !== 'string') {
    throw new Error('status must be a string');
  }

  if (!Array.isArray(payload.items)) {
    throw new Error('items must be an array');
  }

  const items = payload.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Each item must be an object');
    }

    const typedItem = item as Record<string, unknown>;

    if (typeof typedItem.colorId !== 'number') {
      throw new Error('item.colorId must be a number');
    }
    if (typeof typedItem.orderId !== 'number') {
      throw new Error('item.orderId must be a number');
    }
    if (typeof typedItem.variantId !== 'number') {
      throw new Error('item.variantId must be a number');
    }
    if (typeof typedItem.quantity !== 'number') {
      throw new Error('item.quantity must be a number');
    }
    if (typeof typedItem.price !== 'number') {
      throw new Error('item.price must be a number');
    }

    return {
      orderId: typedItem.orderId,
      variantId: typedItem.variantId,
      quantity: typedItem.quantity,
      price: typedItem.price,
      discount: typedItem.discount as number,
      colorId: typedItem.colorId,
    };
  });

  if (!Array.isArray(payload.pointTransactions)) {
    throw new Error('pointTransactions must be an array');
  }

  const pointTransactions = payload.pointTransactions.map(
    (transaction: unknown) => {
      if (!transaction || typeof transaction !== 'object') {
        throw new Error('Each pointTransaction must be an object');
      }

      const typedTransaction = transaction as Record<string, unknown>;

      if (typeof typedTransaction.orderId !== 'number') {
        throw new Error('pointTransaction.orderId must be a number');
      }
      if (typeof typedTransaction.customerId !== 'number') {
        throw new Error('pointTransaction.customerId must be a number');
      }
      if (typeof typedTransaction.points !== 'number') {
        throw new Error('pointTransaction.points must be a number');
      }
      if (typeof typedTransaction.moneyValue !== 'number') {
        throw new Error('pointTransaction.moneyValue must be a number');
      }
      if (typeof typedTransaction.isDeleted !== 'boolean') {
        throw new Error('pointTransaction.isDeleted must be a boolean');
      }

      return {
        orderId: typedTransaction.orderId,
        customerId: typedTransaction.customerId,
        type: typedTransaction.type as PointType,
        points: typedTransaction.points,
        moneyValue: typedTransaction.moneyValue,
        isDeleted: typedTransaction.isDeleted,
      };
    },
  );

  return {
    id: payload.id,
    customerId: payload.customerId,
    orderCode: payload.orderCode,
    status: payload.status,
    items,
    pointTransactions,
    isCodPaid: payload.isCodPaid as boolean | undefined,
  };
}

export class OrderCreatedEvent extends OrderEvent<OrderCreatedPayload> {
  constructor(
    payload: OrderCreatedPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_ORDER_CREATED, payload, options);
  }

  static create(
    payload: OrderCreatedPayload,
    senderId: string,
  ): OrderCreatedEvent {
    return new OrderCreatedEvent(payload, { senderId });
  }

  static from(json: EventJson): OrderCreatedEvent {
    return OrderEvent.fromJson(json) as OrderCreatedEvent;
  }
}

export class OrderUpdatedEvent extends OrderEvent<OrderUpdatedPayload> {
  constructor(
    payload: OrderUpdatedPayload,
    options?: {
      id?: string;
      occurredAt?: Date;
      senderId?: string;
      correlationId?: string;
      version?: string;
    },
  ) {
    super(EVT_ORDER_UPDATED, payload, options);
  }

  static create(
    payload: OrderUpdatedPayload,
    senderId: string,
  ): OrderUpdatedEvent {
    return new OrderUpdatedEvent(payload, { senderId });
  }

  static from(json: EventJson): OrderUpdatedEvent {
    return OrderEvent.fromJson(json) as OrderUpdatedEvent;
  }
}
