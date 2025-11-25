import z from 'zod';

export enum SourceType {
  FILE = 'file',
  DATABASE = 'database',
}

export const checkInventorySchema = z.object({
  phoneName: z
    .string()
    .describe('The name of the phone to check inventory for'),
  variantName: z
    .string()
    .describe('The name of the phone variant to check inventory for'),
});

export type CheckInventoryInput = z.infer<typeof checkInventorySchema>;

export const trackOrderSchema = z.object({
  orderCode: z.string().describe('The code of the order to track'),
  token: z
    .string()
    .describe('The authentication token of the user tracking the order'),
});

export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

export const shippingQuoteSchema = z.object({
  province: z.string().describe('The province of the shipping address'),
  commune: z.string().describe('The commune of the shipping address'),
});

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
