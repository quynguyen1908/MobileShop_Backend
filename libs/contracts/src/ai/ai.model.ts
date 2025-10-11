import z from 'zod';

export enum SourceType {
  FILE = 'file',
  DATABASE = 'database',
}

export const checkInventorySchema = z.object({
  sku: z.string().describe('The SKU of the product to check inventory for'),
});

export type CheckInventoryInput = z.infer<typeof checkInventorySchema>;

export const trackOrderSchema = z.object({
  orderId: z.string().describe('The ID of the order to track'),
});

export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

export const shippingQuoteSchema = z.object({
  address: z.string().describe('The full shipping address'),
  province: z.string().describe('The province of the shipping address'),
  commune: z.string().describe('The commune of the shipping address'),
});

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
