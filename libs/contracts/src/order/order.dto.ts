import {
  ErrColorNameAtMost50Chars,
  ErrPhoneNameAtMost100Chars,
  ErrVariantNameAtMost100Chars,
} from '../phone/phone.model';
import { communeSchema, provinceSchema } from '../user/user.model';
import {
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
      name: z.string().max(100, ErrPhoneNameAtMost100Chars.message),
      imageUrl: z.url(),
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
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    commune: communeSchema,
    province: provinceSchema,
    items: orderItemsDtoSchema.array(),
    statusHistory: statusHistoryDtoSchema.array(),
    transactions: pointTransactionDtoSchema.array(),
    shipments: shipmentDtoSchema.array().optional(),
  });

export type OrderDto = z.infer<typeof orderDtoSchema>;
