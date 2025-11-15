import {
  paymentDtoSchema,
  paymentMethodDtoSchema,
} from '../payment/payment.dto';
import {
  ErrColorNameAtMost50Chars,
  ErrPhoneNameAtMost100Chars,
  ErrVariantNameAtMost100Chars,
} from '../phone/phone.model';
import { communeSchema, provinceSchema } from '../user/user.model';
import {
  cartItemSchema,
  cartSchema,
  orderItemSchema,
  orderSchema,
  orderStatusHistorySchema,
  pointTransactionSchema,
  shipmentSchema,
} from './order.model';
import { z } from 'zod';

// Order Item

const orderItemsDtoSchema = orderItemSchema
  .omit({
    colorId: true,
    variantId: true,
  })
  .extend({
    variant: z.object({
      id: z.number().int().positive(),
      phoneId: z.number().int().positive(),
      variantName: z.string().max(100, ErrVariantNameAtMost100Chars.message),
      color: z.string().max(50, ErrColorNameAtMost50Chars.message),
      colorId: z.number().int().positive(),
      name: z.string().max(100, ErrPhoneNameAtMost100Chars.message),
      imageUrl: z.url(),
      stockQuantity: z.number().int().min(0).optional(),
    }),
  });

export type OrderItemDto = z.infer<typeof orderItemsDtoSchema>;

// Order Status History

const statusHistoryDtoSchema = orderStatusHistorySchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

// Point Transaction

const pointTransactionDtoSchema = pointTransactionSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export const pointHistoryDtoSchema = pointTransactionSchema
  .omit({
    orderId: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    orderCode: orderSchema.shape.orderCode,
  });

export type PointHistoryDto = z.infer<typeof pointHistoryDtoSchema>;

// Shipment

export const shipmentDtoSchema = shipmentSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

// Order

export const orderDtoSchema = orderSchema
  .omit({
    communeId: true,
    provinceId: true,
  })
  .extend({
    commune: communeSchema,
    province: provinceSchema,
    items: orderItemsDtoSchema.array(),
    statusHistory: statusHistoryDtoSchema.array(),
    transactions: pointTransactionDtoSchema.array(),
    shipments: shipmentDtoSchema.array().optional(),
    payments: paymentDtoSchema.array().optional(),
  });

export type OrderDto = z.infer<typeof orderDtoSchema>;

// Cart Item

export const cartItemDtoSchema = cartItemSchema
  .pick({
    id: true,
    cartId: true,
  })
  .extend({
    variant: orderItemsDtoSchema.shape.variant,
  });

export type CartItemDto = z.infer<typeof cartItemDtoSchema>;

// Cart

export const cartDtoSchema = cartSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    items: cartItemDtoSchema.array(),
  });

export type CartDto = z.infer<typeof cartDtoSchema>;

// Create Order Item

export const orderItemCreateDtoSchema = orderItemSchema.pick({
  variantId: true,
  colorId: true,
  quantity: true,
  price: true,
  discount: true,
});

export type OrderItemCreateDto = z.infer<typeof orderItemCreateDtoSchema>;

// Create Order

export const orderCreateDtoSchema = orderSchema
  .pick({
    totalAmount: true,
    discountAmount: true,
    shippingFee: true,
    finalAmount: true,
    recipientName: true,
    recipientPhone: true,
    street: true,
    communeId: true,
    provinceId: true,
    postalCode: true,
  })
  .extend({
    items: orderItemCreateDtoSchema
      .array()
      .min(1, 'Order must have at least one item'),
    voucherIdsApplied: z.array(z.number().int().positive()).optional(),
    pointUsed: z.number().int().min(0).optional(),
    paymentMethod: paymentMethodDtoSchema,
  });

export type OrderCreateDto = z.infer<typeof orderCreateDtoSchema>;

// Create Cart Item

export const cartItemCreateDtoSchema = cartItemSchema.pick({
  variantId: true,
  colorId: true,
  quantity: true,
  price: true,
  discount: true,
});

export type CartItemCreateDto = z.infer<typeof cartItemCreateDtoSchema>;

// Dashboard Stats

export const revenuePointDtoSchema = z.object({
  label: z.string(),
  value: z.number().min(0),
  date: z.string(),
});

export type RevenuePointDto = z.infer<typeof revenuePointDtoSchema>;

export const revenueByPeriodDtoSchema = z.object({
  last7Days: z.object({
    total: z.number().min(0),
    data: revenuePointDtoSchema.array().length(7),
    period: z.literal("daily"),
  }),
  last30Days: z.object({
    total: z.number().min(0),
    data: revenuePointDtoSchema.array().length(30),
    period: z.literal("daily"),
  }),
  last3Months: z.object({
    total: z.number().min(0),
    data: revenuePointDtoSchema.array().length(3),
    period: z.literal("monthly"),
  }),
  last6Months: z.object({
    total: z.number().min(0),
    data: revenuePointDtoSchema.array().length(6),
    period: z.literal("monthly"),
  }),
  lastYear: z.object({
    total: z.number().min(0),
    data: revenuePointDtoSchema.array().length(12),
    period: z.literal("monthly"),
  }),
});

export type RevenueByPeriodDto = z.infer<typeof revenueByPeriodDtoSchema>;

export const bestSellingProductDtoSchema = z.object({
  variantName: z.string(),
  totalSoldQuantity: z.number().int().min(0),
  revenue: z.number().min(0),
});

export type BestSellingProductDto = z.infer<typeof bestSellingProductDtoSchema>;

export const dashboardStatsDtoSchema = z.object({
  totalProducts: z.number().int().min(0),
  totalCustomers: z.number().int().min(0),
  totalOrders: z.number().int().min(0),
  thisMonthOrders: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  thisMonthRevenue: z.number().min(0),
  revenueByPeriod: revenueByPeriodDtoSchema,
  paymentMethods: z.record(z.string(), z.number()),
  orderStatuses: z.record(z.string(), z.number()),
  top10BestSellingProducts: bestSellingProductDtoSchema.array(),
});

export type DashboardStatsDto = z.infer<typeof dashboardStatsDtoSchema>;
  
