import { z } from 'zod';

// Brand

export const ErrBrandNameAtMost100Chars = new Error(
  'Brand name must be at most 100 characters long',
);

export const brandSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().max(100, ErrBrandNameAtMost100Chars.message),
  imageId: z.number().int().positive().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Brand = z.infer<typeof brandSchema>;

// Category

export const categorySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string(),
  parentId: z.number().int().positive().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Category = z.infer<typeof categorySchema>;

// Phone

export const ErrPhoneNameAtMost100Chars = new Error(
  'Phone name must be at most 100 characters long',
);
export const ErrPhoneNotFound = new Error('Phone not found');
export const ErrBrandNotFound = new Error('Brand not found');
export const ErrCategoryNotFound = new Error('Category not found');
export const ErrPhoneVariantNotFound = new Error('Phone variant not found');
export const ErrVariantColorNotFound = new Error('Variant color not found');
export const ErrVariantPriceNotFound = new Error('Variant price not found');
export const ErrVariantDiscountNotFound = new Error(
  'Variant discount not found',
);
export const ErrVariantImagesNotFound = new Error('Variant images not found');
export const ErrVariantSpecificationsNotFound = new Error(
  'Variant specifications not found',
);
export const ErrSpecificationNotFound = new Error('Specification not found');

export const phoneSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().max(100, ErrPhoneNameAtMost100Chars.message),
  brandId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Phone = z.infer<typeof phoneSchema>;

// Color

export const ErrColorNameAtMost50Chars = new Error(
  'Color name must be at most 50 characters long',
);
export const ErrColorNotFound = new Error('Color not found');

export const colorSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().max(50, ErrColorNameAtMost50Chars.message),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Color = z.infer<typeof colorSchema>;

// Image

export const imageSchema = z.object({
  id: z.number().int().positive().optional(),
  imageUrl: z.url(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Image = z.infer<typeof imageSchema>;

// Phone Variant

export const ErrVariantNameAtMost100Chars = new Error(
  'Variant name must be at most 100 characters long',
);

export const phoneVariantSchema = z.object({
  id: z.number().int().positive().optional(),
  phoneId: z.number().int().positive(),
  variantName: z.string().max(100, ErrVariantNameAtMost100Chars.message),
  description: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type PhoneVariant = z.infer<typeof phoneVariantSchema>;

// Variant Color

export const variantColorSchema = z.object({
  variantId: z.number().int().positive(),
  colorId: z.number().int().positive(),
  imageId: z.number().int().positive(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type VariantColor = z.infer<typeof variantColorSchema>;

// Variant Image

export const variantImageSchema = z.object({
  id: z.number().int().positive().optional(),
  variantId: z.number().int().positive(),
  imageId: z.number().int().positive(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type VariantImage = z.infer<typeof variantImageSchema>;

// Variant Price

export const variantPriceSchema = z.object({
  id: z.number().int().positive().optional(),
  variantId: z.number().int().positive(),
  price: z.number().nonnegative(),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type VariantPrice = z.infer<typeof variantPriceSchema>;

// Variant Discount

export const variantDiscountSchema = z.object({
  id: z.number().int().positive().optional(),
  variantId: z.number().int().positive(),
  discountPercent: z.number().min(0).max(100),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type VariantDiscount = z.infer<typeof variantDiscountSchema>;

// Inventory

export const ErrInventoryNotFound = new Error('Inventory not found');

export const inventorySchema = z.object({
  id: z.number().int().positive().optional(),
  variantId: z.number().int().positive(),
  colorId: z.number().int().positive(),
  sku: z.string(),
  stockQuantity: z.number().int().nonnegative().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Inventory = z.infer<typeof inventorySchema>;

// Specification

export const ErrSpecNameAtMost100Chars = new Error(
  'Specification name must be at most 100 characters long',
);

export const specificationSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().max(100, ErrSpecNameAtMost100Chars.message),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Specification = z.infer<typeof specificationSchema>;

// Variant Specification

export const variantSpecificationSchema = z.object({
  variantId: z.number().int().positive(),
  specId: z.number().int().positive(),
  info: z.string(),
  valueNumeric: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type VariantSpecification = z.infer<typeof variantSpecificationSchema>;

// Review

export const reviewSchema = z.object({
  id: z.number().int().positive().optional(),
  orderId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Review = z.infer<typeof reviewSchema>;
