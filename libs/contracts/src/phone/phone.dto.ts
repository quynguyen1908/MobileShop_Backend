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

export const inventoryUpdateDtoSchema = inventorySchema
  .pick({
    variantId: true,
    colorId: true,
    sku: true,
    stockQuantity: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type InventoryUpdateDto = z.infer<typeof inventoryUpdateDtoSchema>;

// Inventory

export const inventoryDtoSchema = inventorySchema
  .omit({
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    color: colorSchema
      .omit({
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      })
      .optional(),
  });

export type InventoryDto = z.infer<typeof inventoryDtoSchema>;

export const inventoryCreateDtoSchema = inventorySchema
  .pick({
    variantId: true,
    colorId: true,
    sku: true,
    stockQuantity: true,
  })
  .required();

export type InventoryCreateDto = z.infer<typeof inventoryCreateDtoSchema>;

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
    valueNumeric: variantSpecificationSchema.shape.valueNumeric.optional(),
    unit: variantSpecificationSchema.shape.unit.optional(),
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

// Phone with Variants

export const phoneWithVariantsDtoSchema = phoneDtoSchema.extend({
  variants: phoneVariantDtoSchema
    .omit({
      phone: true,
    })
    .array(),
});

export type PhoneWithVariantsDto = z.infer<typeof phoneWithVariantsDtoSchema>;

// Create Brand

export const brandCreateDtoSchema = brandSchema
  .pick({
    name: true,
  })
  .extend({
    imageUrl: z.url(),
  })
  .required();

export type BrandCreateDto = z.infer<typeof brandCreateDtoSchema>;

// Create Category

export const categoryCreateDtoSchema = categorySchema
  .pick({
    name: true,
    parentId: true,
  })
  .required();

export type CategoryCreateDto = z.infer<typeof categoryCreateDtoSchema>;

// Update Variant Price

export const variantPriceUpdateDtoSchema = variantPriceSchema
  .pick({
    price: true,
    startDate: true,
    endDate: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type VariantPriceUpdateDto = z.infer<typeof variantPriceUpdateDtoSchema>;

// Update Variant Discount

export const variantDiscountUpdateDtoSchema = variantDiscountSchema
  .pick({
    discountPercent: true,
    startDate: true,
    endDate: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type VariantDiscountUpdateDto = z.infer<
  typeof variantDiscountUpdateDtoSchema
>;

// Create Variant Color

export const variantColorCreateDtoSchema = variantColorSchema
  .pick({
    colorId: true,
  })
  .extend({
    imageUrl: z.url(),
  })
  .required();

// Create Variant Specification

export const variantSpecificationCreateDtoSchema =
  variantSpecificationSchema.pick({
    specId: true,
    info: true,
    unit: true,
  });

export type VariantSpecificationCreateDto = z.infer<
  typeof variantSpecificationCreateDtoSchema
>;

// Create Phone Variant

export const phoneVariantCreateDtoSchema = phoneVariantSchema
  .pick({
    variantName: true,
    description: true,
  })
  .extend({
    colors: variantColorCreateDtoSchema.array(),
    price: variantPriceSchema.shape.price,
    images: z.array(z.url()).optional(),
    specifications: variantSpecificationCreateDtoSchema.array(),
  })
  .required()
  .extend({
    discountPercent: variantDiscountSchema.shape.discountPercent.optional(),
  });

export type PhoneVariantCreateDto = z.infer<typeof phoneVariantCreateDtoSchema>;

// Create Phone

export const phoneCreateDtoSchema = phoneSchema
  .pick({
    name: true,
    brandId: true,
    categoryId: true,
  })
  .extend({
    variants: phoneVariantCreateDtoSchema.array(),
  })
  .required();

export type PhoneCreateDto = z.infer<typeof phoneCreateDtoSchema>;

// Cteate Review

export const reviewCreateDtoSchema = reviewSchema
  .pick({
    rating: true,
    variantId: true,
  })
  .required()
  .extend({
    comment: reviewSchema.shape.comment,
  });

export type ReviewCreateDto = z.infer<typeof reviewCreateDtoSchema>;

// Update Brand

export const brandUpdateDtoSchema = brandSchema
  .pick({
    name: true,
    imageId: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type BrandUpdateDto = z.infer<typeof brandUpdateDtoSchema>;

// Update Category

export const categoryUpdateDtoSchema = categorySchema
  .pick({
    name: true,
    parentId: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type CategoryUpdateDto = z.infer<typeof categoryUpdateDtoSchema>;

// Update Variant Color

export const variantColorUpdateDtoSchema = variantColorSchema
  .pick({
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    imageUrl: z.url(),
    newColorId: variantColorSchema.shape.colorId,
  })
  .partial()
  .extend({
    colorId: variantColorSchema.shape.colorId,
  });

export const variantColorUpdatePrismaSchema = variantColorSchema
  .pick({
    colorId: true,
    imageId: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type VariantColorUpdatePrisma = z.infer<
  typeof variantColorUpdatePrismaSchema
>;

// Update Variant Image

export const variantImageUpdateDtoSchema = variantImageSchema
  .pick({
    id: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial()
  .extend({
    imageUrl: z.url(),
  });

// Update Variant Specification

export const variantSpecificationUpdateDtoSchema = variantSpecificationSchema
  .pick({
    unit: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    newSpecId: variantSpecificationSchema.shape.specId,
  })
  .partial()
  .extend({
    specId: variantSpecificationSchema.shape.specId,
    info: variantSpecificationSchema.shape.info,
  });

export const variantSpecificationUpdatePrismaSchema = variantSpecificationSchema
  .pick({
    specId: true,
    info: true,
    valueNumeric: true,
    unit: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type VariantSpecificationUpdatePrisma = z.infer<
  typeof variantSpecificationUpdatePrismaSchema
>;

// Update Phone Variant

export const phoneVariantUpdateDtoSchema = phoneVariantSchema
  .pick({
    variantName: true,
    description: true,
    updatedAt: true,
    isDeleted: true,
  })
  .extend({
    colors: variantColorUpdateDtoSchema.array().optional(),
    price: variantPriceSchema.shape.price.optional(),
    discount: variantDiscountSchema.shape.discountPercent.optional(),
    images: variantImageUpdateDtoSchema.array().optional(),
    specifications: variantSpecificationUpdateDtoSchema.array().optional(),
  })
  .partial();

export type PhoneVariantUpdateDto = z.infer<typeof phoneVariantUpdateDtoSchema>;

export const phoneVariantUpdatePrismaSchema = phoneVariantSchema
  .pick({
    variantName: true,
    description: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type PhoneVariantUpdatePrisma = z.infer<
  typeof phoneVariantUpdatePrismaSchema
>;

// Update Phone

export const phoneUpdateDtoSchema = phoneSchema
  .pick({
    name: true,
    brandId: true,
    categoryId: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type PhoneUpdateDto = z.infer<typeof phoneUpdateDtoSchema>;
