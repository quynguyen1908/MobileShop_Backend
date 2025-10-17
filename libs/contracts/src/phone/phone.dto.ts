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
  Category,
  imageSchema,
  variantColorSchema,
  inventorySchema,
} from './phone.model';
import { z } from 'zod';

// Brand

export const brandDtoSchema = brandSchema
  .omit({
    imageId: true,
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    image: imageSchema.omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
  });

export type BrandDto = z.infer<typeof brandDtoSchema>;

// Category

type CategoryDtoType = Omit<
  Category,
  'createdAt' | 'updatedAt' | 'isDeleted'
> & {
  children?: CategoryDtoType[];
};

const categoryDtoSchema: z.ZodType<CategoryDtoType> = z.lazy(() =>
  categorySchema
    .omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    })
    .extend({
      children: z.array(categoryDtoSchema).optional(),
    }),
);

export type CategoryDto = z.infer<typeof categoryDtoSchema>;

// Phone Filter

export const phoneFilterDtoSchema = z
  .object({
    brand: z.union([z.string(), z.array(z.string())]).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    chipset: z.union([z.string(), z.array(z.string())]).optional(),
    os: z.union([z.string(), z.array(z.string())]).optional(),
    minRam: z.coerce.number().int().nonnegative().optional(),
    maxRam: z.coerce.number().int().nonnegative().optional(),
    minStorage: z.coerce.number().int().nonnegative().optional(),
    maxStorage: z.coerce.number().int().nonnegative().optional(),
    minScreenSize: z.coerce.number().nonnegative().optional(),
    maxScreenSize: z.coerce.number().nonnegative().optional(),
    nfc: z.coerce.boolean().optional(),
  })
  .refine(
    (data) =>
      !(data.minPrice && data.maxPrice) || data.maxPrice >= data.minPrice,
    {
      message: 'maxPrice must be greater than or equal to minPrice',
      path: ['maxPrice'],
    },
  )
  .refine(
    (data) => !(data.minRam && data.maxRam) || data.maxRam >= data.minRam,
    {
      message: 'maxRam must be greater than or equal to minRam',
      path: ['maxRam'],
    },
  )
  .refine(
    (data) =>
      !(data.minStorage && data.maxStorage) ||
      data.maxStorage >= data.minStorage,
    {
      message: 'maxStorage must be greater than or equal to minStorage',
      path: ['maxStorage'],
    },
  )
  .refine(
    (data) =>
      !(data.minScreenSize && data.maxScreenSize) ||
      data.maxScreenSize >= data.minScreenSize,
    {
      message: 'maxScreenSize must be greater than or equal to minScreenSize',
      path: ['maxScreenSize'],
    },
  );

export type PhoneFilterDto = z.infer<typeof phoneFilterDtoSchema>;

// Phone Variant View

export const phoneVariantViewDtoSchema = z.object({
  variant_id: z.number().int().nonnegative(),
  phone_id: z.number().int().nonnegative(),
  variant_name: z.string(),
  phone_name: z.string(),
  brand_name: z.string(),
  category_name: z.string(),
  price: z.number().int().nonnegative(),
  discount_percent: z.number().int().min(0).max(100).nullable(),
  final_price: z.number().int().nonnegative(),
  ram_gb: z.number().int().nonnegative(),
  rom_gb: z.number().int().nonnegative(),
  chipset: z.string().nullable(),
  os: z.string().nullable(),
  screen_size: z.number().nonnegative().nullable(),
  nfc: z.boolean().nullable(),
});

export type PhoneVariantViewDto = z.infer<typeof phoneVariantViewDtoSchema>;

// Update Inventory

export const updateInventoryDtoSchema = inventorySchema
  .pick({
    variantId: true,
    colorId: true,
    sku: true,
    stockQuantity: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type UpdateInventoryDto = z.infer<typeof updateInventoryDtoSchema>;

// Inventory

export const inventoryDtoSchema = inventorySchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export type InventoryDto = z.infer<typeof inventoryDtoSchema>;

// Variant Image

const variantImageDtoSchema = variantImageSchema
  .omit({
    imageId: true,
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    image: imageSchema.omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
  });

export type VariantImageDto = z.infer<typeof variantImageDtoSchema>;

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

// Variant Color

export const variantColorDtoSchema = variantColorSchema
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
  });

export type VariantColorDto = z.infer<typeof variantColorDtoSchema>;

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
    brand: brandDtoSchema,
    category: categorySchema.omit({
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
  });

// Phone Variant

export const phoneVariantDtoSchema = phoneVariantSchema
  .omit({
    phoneId: true,
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    phone: phoneDtoSchema,
    colors: variantColorDtoSchema.array(),
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
    inventories: inventoryDtoSchema.array(),
    specifications: variantSpecificationDtoSchema.array(),
    reviews: reviewDtoSchema.array().optional(),
    averageRating: z.number().min(0).max(5).default(0),
  });

export type PhoneVariantDto = z.infer<typeof phoneVariantDtoSchema>;
