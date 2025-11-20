import z from 'zod';

export enum SourceType {
  FILE = 'file',
  DATABASE = 'database',
}

export const checkInventorySchema = z.object({
  variantName: z
    .string()
    .describe('The name of the product variant to check inventory for'),
});

export type CheckInventoryInput = z.infer<typeof checkInventorySchema>;

export const trackOrderSchema = z.object({
  orderCode: z.string().describe('The code of the order to track'),
});

export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

export const shippingQuoteSchema = z.object({
  province: z.string().describe('The province of the shipping address'),
  commune: z.string().describe('The commune of the shipping address'),
});

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
