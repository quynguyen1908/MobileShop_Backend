import { z } from 'zod';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

export enum PointType {
  EARN = 'earn',
  REDEEM = 'redeem',
  REFUND = 'refund',
}

export enum ShipmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

// Order

export const ErrOrderCodeMax50Chars = new Error(
  'Order code must be at most 50 characters long',
);
export const ErrRecipientPhoneMax50 = new Error(
  'Recipient phone must be at most 50 characters long',
);
export const ErrPostalCodeMax20 = new Error(
  'Postal code must be at most 20 characters long',
);
export const ErrStatusMax50 = new Error(
  'Status must be at most 50 characters long',
);
export const ErrOrderNotFound = new Error('Order not found');
export const ErrLocationNotFound = new Error('Location not found');

export const orderSchema = z.object({
  id: z.number().int().positive().optional(),
  customerId: z.number().int().positive(),
  orderCode: z.string().max(50, ErrOrderCodeMax50Chars.message),
  orderDate: z.date(),
  totalAmount: z.number().int().nonnegative(),
  discountAmount: z.number().int().nonnegative().optional().default(0),
  shippingFee: z.number().int().nonnegative().optional().default(0),
  finalAmount: z.number().int().nonnegative(),
  recipientName: z.string(),
  recipientPhone: z.string().max(50, ErrRecipientPhoneMax50.message),
  status: z.enum(OrderStatus).default(OrderStatus.PENDING),
  street: z.string(),
  communeId: z.number().int().positive(),
  provinceId: z.number().int().positive(),
  postalCode: z
    .string()
    .max(20, ErrPostalCodeMax20.message)
    .optional()
    .nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Order = z.infer<typeof orderSchema>;

// Order Item

export const orderItemSchema = z.object({
  id: z.number().int().positive().optional(),
  orderId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative().optional().default(0),
  colorId: z.number().int().positive(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Order Status History

export const orderStatusHistorySchema = z.object({
  id: z.number().int().positive().optional(),
  orderId: z.number().int().positive(),
  status: z.enum(OrderStatus),
  note: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type OrderStatusHistory = z.infer<typeof orderStatusHistorySchema>;

// Point Transaction

export const pointTransactionSchema = z.object({
  id: z.number().int().positive().optional(),
  customerId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  type: z.enum(PointType),
  points: z.number().int().nonnegative(),
  moneyValue: z.number().int().nonnegative(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type PointTransaction = z.infer<typeof pointTransactionSchema>;

// Point Config

export const pointConfigSchema = z.object({
  id: z.number().int().positive().optional(),
  earnRate: z.number().int().nonnegative(),
  redeemRate: z.number().int().nonnegative(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type PointConfig = z.infer<typeof pointConfigSchema>;

// Shipment

export const ErrProviderMax100 = new Error(
  'Provider must be at most 100 characters long',
);
export const ErrTrackingCodeMax100 = new Error(
  'Tracking code must be at most 100 characters long',
);

export const shipmentSchema = z.object({
  id: z.number().int().positive().optional(),
  orderId: z.number().int().positive(),
  provider: z.string().max(100, ErrProviderMax100.message),
  trackingCode: z
    .string()
    .max(100, ErrTrackingCodeMax100.message)
    .optional()
    .nullable(),
  status: z.enum(ShipmentStatus).default(ShipmentStatus.PENDING),
  fee: z.number().int().nonnegative().optional().default(0),
  estimatedDeliveryDate: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Shipment = z.infer<typeof shipmentSchema>;

// Cart

export const ErrCartNotFound = new Error('Cart not found');

export const cartSchema = z.object({
  id: z.number().int().positive().optional(),
  customerId: z.number().int().positive(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Cart = z.infer<typeof cartSchema>;

// Cart Item

export const cartItemSchema = z.object({
  id: z.number().int().positive().optional(),
  cartId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  colorId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative().optional().default(0),
});

export type CartItem = z.infer<typeof cartItemSchema>;
