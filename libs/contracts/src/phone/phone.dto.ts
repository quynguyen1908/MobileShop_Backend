import {
  brandSchema,
  categorySchema,
  phoneSchema,
  reviewSchema,
  phoneVariantSchema,
  colorSchema,
  variantPriceSchema,
  variantDiscountSchema,
  variantImageSchema,
  variantSpecificationSchema,
  specificationSchema,
} from './phone.model';
import { z } from 'zod';

// Variant Image

const variantImageDtoSchema = variantImageSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

// Variant Specification

const variantSpecificationDtoSchema = variantSpecificationSchema
  .pick({
    info: true,
  })
  .extend({
    specification: specificationSchema.pick({
      name: true,
    }),
  });

export type VariantSpecificationDto = z.infer<
  typeof variantSpecificationDtoSchema
>;

// Phone Variant

const variantDtoSchema = phoneVariantSchema
  .omit({
    colorId: true,
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    color: colorSchema.omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
    price: variantPriceSchema.omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
    discount: variantDiscountSchema
      .omit({
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      })
      .optional(),
    images: variantImageDtoSchema.array(),
    specifications: variantSpecificationDtoSchema.array(),
  });

export type VariantDto = z.infer<typeof variantDtoSchema>;

// Review

const reviewDtoSchema = reviewSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

// Phone

export const phoneDtoSchema = phoneSchema
  .omit({
    brandId: true,
    categoryId: true,
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    brand: brandSchema.omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
    category: categorySchema.omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
    variants: variantDtoSchema.array(),
    reviews: reviewDtoSchema.array().optional(),
  });

export type PhoneDto = z.infer<typeof phoneDtoSchema>;
