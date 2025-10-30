/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IPhoneRepository } from './phone.port';
import { PhonePrismaService } from '@app/contracts/prisma';
import {
  Brand,
  BrandUpdateDto,
  Category,
  CategoryUpdateDto,
  Color,
  Image,
  Inventory,
  Phone,
  PhoneFilterDto,
  PhoneUpdateDto,
  PhoneVariant,
  PhoneVariantUpdatePrisma,
  PhoneVariantViewDto,
  Review,
  Specification,
  VariantColor,
  VariantColorUpdatePrisma,
  VariantDiscount,
  VariantDiscountUpdateDto,
  VariantImage,
  VariantPrice,
  VariantPriceUpdateDto,
  VariantSpecification,
  VariantSpecificationUpdatePrisma,
} from '@app/contracts/phone';
import { Decimal } from '@prisma/client/runtime/library';
import { Paginated, PagingDto } from '@app/contracts';
import { InventoryUpdateDto } from '@app/contracts/phone';

interface PrismaBrand {
  id: number;
  name: string;
  imageId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaCategory {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaPhone {
  id: number;
  name: string;
  brandId: number;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaColor {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaImage {
  id: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaPhoneVariant {
  id: number;
  phoneId: number;
  variantName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVariantColor {
  variantId: number;
  colorId: number;
  imageId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVariantPrice {
  id: number;
  variantId: number;
  price: Decimal;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVariantDiscount {
  id: number;
  variantId: number;
  discountPercent: Decimal;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVariantImage {
  id: number;
  variantId: number;
  imageId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaSpecification {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaVariantSpecification {
  variantId: number;
  specId: number;
  info: string;
  valueNumeric: number | null;
  unit: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaInventory {
  id: number;
  variantId: number;
  colorId: number;
  sku: string;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaReview {
  id: number;
  orderId: number;
  customerId: number;
  variantId: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

@Injectable()
export class PhoneRepository implements IPhoneRepository {
  constructor(private prisma: PhonePrismaService) {}

  // Brand

  async findBrandsByIds(ids: number[]): Promise<Brand[]> {
    const prismaService = this.prisma as unknown as {
      brand: {
        findMany: (params: { where: any }) => Promise<PrismaBrand[]>;
      };
    };
    const brands = await prismaService.brand.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
    });
    return brands.map((brand) => this._toBrandModel(brand));
  }

  async findAllBrands(): Promise<Brand[]> {
    const prismaService = this.prisma as unknown as {
      brand: {
        findMany: (params: { where: any }) => Promise<PrismaBrand[]>;
      };
    };
    const brands = await prismaService.brand.findMany({
      where: { isDeleted: false },
    });
    return brands.map((brand) => this._toBrandModel(brand));
  }

  async insertBrand(brand: Brand): Promise<Brand> {
    const prismaService = this.prisma as unknown as {
      brand: {
        create: (params: { data: any }) => Promise<PrismaBrand>;
      };
    };
    const createdBrand = await prismaService.brand.create({ data: brand });
    return this._toBrandModel(createdBrand);
  }

  async updateBrand(id: number, data: BrandUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      brand: {
        update: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.brand.update({
      where: { id },
      data,
    });
  }

  async softDeleteBrand(id: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      brand: {
        update: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.brand.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Category

  async findCategoriesByIds(ids: number[]): Promise<Category[]> {
    const prismaService = this.prisma as unknown as {
      category: {
        findMany: (params: { where: any }) => Promise<PrismaCategory[]>;
      };
    };
    const categories = await prismaService.category.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
    });
    return categories.map((category) => this._toCategoryModel(category));
  }

  async findAllCategories(): Promise<Category[]> {
    const prismaService = this.prisma as unknown as {
      category: {
        findMany: (params: { where: any }) => Promise<PrismaCategory[]>;
      };
    };
    const categories = await prismaService.category.findMany({
      where: { isDeleted: false },
    });
    return categories.map((category) => this._toCategoryModel(category));
  }

  async insertCategory(category: Category): Promise<Category> {
    const prismaService = this.prisma as unknown as {
      category: {
        create: (params: { data: any }) => Promise<PrismaCategory>;
      };
    };
    const createdCategory = await prismaService.category.create({
      data: category,
    });
    return this._toCategoryModel(createdCategory);
  }

  async updateCategory(id: number, data: CategoryUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      category: {
        update: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.category.update({
      where: { id },
      data,
    });
  }

  async softDeleteCategoriesByIds(ids: number[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      category: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.category.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });
  }

  async findAllChildCategoryIds(parentId: number): Promise<number[]> {
    const allCategories = await this.findAllCategories();

    const childCategoryIds: number[] = [];

    const findChildrenRecursively = (parentId: number) => {
      const children = allCategories.filter(
        (category) => category.parentId === parentId,
      );
      for (const child of children) {
        if (child.id !== undefined) {
          childCategoryIds.push(child.id);
          findChildrenRecursively(child.id);
        }
      }
    };
    findChildrenRecursively(parentId);
    return childCategoryIds;
  }

  // Phone Variant

  async findVariantsById(id: number): Promise<PhoneVariant | null> {
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        findFirst: (params: {
          where: any;
        }) => Promise<PrismaPhoneVariant | null>;
      };
    };
    const variant = await prismaService.phoneVariant.findFirst({
      where: {
        id: id,
        isDeleted: false,
      },
    });
    if (!variant) {
      return null;
    }
    return this._toPhoneVariantModel(variant);
  }

  async findVariantsByIds(ids: number[]): Promise<PhoneVariant[]> {
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        findMany: (params: { where: any }) => Promise<PrismaPhoneVariant[]>;
      };
    };
    const variants = await prismaService.phoneVariant.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
    });
    return variants.map((variant) => this._toPhoneVariantModel(variant));
  }

  async findVariantsByPhoneId(phoneId: number): Promise<PhoneVariant[]> {
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        findMany: (params: { where: any }) => Promise<PrismaPhoneVariant[]>;
      };
    };
    const variants = await prismaService.phoneVariant.findMany({
      where: {
        phoneId: phoneId,
        isDeleted: false,
      },
    });
    return variants.map((variant) => this._toPhoneVariantModel(variant));
  }

  async findVariantsByPhoneIds(phoneIds: number[]): Promise<PhoneVariant[]> {
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        findMany: (params: { where: any }) => Promise<PrismaPhoneVariant[]>;
      };
    };
    const variants = await prismaService.phoneVariant.findMany({
      where: {
        phoneId: { in: phoneIds },
        isDeleted: false,
      },
    });
    return variants.map((variant) => this._toPhoneVariantModel(variant));
  }

  async listPhoneVariants(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneVariant>> {
    const skip = (paging.page - 1) * paging.limit;
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        count: (params: { where: any }) => Promise<number>;
        findMany: (params: {
          where: any;
          skip: number;
          take: number;
          orderBy: any;
        }) => Promise<PrismaPhoneVariant[]>;
      };
    };

    if (this.isFilterEmpty(filter)) {
      const total = await prismaService.phoneVariant.count({
        where: { isDeleted: false },
      });
      const variants = await prismaService.phoneVariant.findMany({
        where: { isDeleted: false },
        skip,
        take: paging.limit,
        orderBy: { id: 'asc' },
      });
      return {
        data: variants.map((variant) => this._toPhoneVariantModel(variant)),
        paging,
        total,
      };
    }

    const queryConditions: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (filter.brand) {
      if (Array.isArray(filter.brand)) {
        const placeholders = filter.brand
          .map(
            (_, index) => `brand_name ILIKE $${queryParams.length + 1 + index}`,
          )
          .join(' OR ');
        queryConditions.push(`(${placeholders})`);
        filter.brand.forEach((b) => queryParams.push(`%${b}%`));
      } else {
        queryConditions.push('brand_name ILIKE $' + (queryParams.length + 1));
        queryParams.push(`%${filter.brand}%`);
      }
    }
    if (filter.minPrice !== undefined) {
      queryConditions.push('final_price >= $' + (queryParams.length + 1));
      queryParams.push(filter.minPrice);
    }
    if (filter.maxPrice !== undefined) {
      queryConditions.push('final_price <= $' + (queryParams.length + 1));
      queryParams.push(filter.maxPrice);
    }
    if (filter.minRam !== undefined) {
      queryConditions.push('ram_gb >= $' + (queryParams.length + 1));
      queryParams.push(filter.minRam);
    }
    if (filter.maxRam !== undefined) {
      queryConditions.push('ram_gb <= $' + (queryParams.length + 1));
      queryParams.push(filter.maxRam);
    }
    if (filter.minStorage !== undefined) {
      queryConditions.push('rom_gb >= $' + (queryParams.length + 1));
      queryParams.push(filter.minStorage);
    }
    if (filter.maxStorage !== undefined) {
      queryConditions.push('rom_gb <= $' + (queryParams.length + 1));
      queryParams.push(filter.maxStorage);
    }
    if (filter.chipset) {
      if (Array.isArray(filter.chipset)) {
        const placeholders = filter.chipset
          .map((_, index) => `chipset ILIKE $${queryParams.length + 1 + index}`)
          .join(' OR ');
        queryConditions.push(`(${placeholders})`);
        filter.chipset.forEach((chip) => queryParams.push(`%${chip}%`));
      } else {
        queryConditions.push('chipset ILIKE $' + (queryParams.length + 1));
        queryParams.push(`%${filter.chipset}%`);
      }
    }
    if (filter.os) {
      if (Array.isArray(filter.os)) {
        const placeholders = filter.os
          .map((_, index) => `os ILIKE $${queryParams.length + 1 + index}`)
          .join(' OR ');
        queryConditions.push(`(${placeholders})`);
        filter.os.forEach((os) => queryParams.push(`%${os}%`));
      } else {
        queryConditions.push('os ILIKE $' + (queryParams.length + 1));
        queryParams.push(`%${filter.os}%`);
      }
    }
    if (filter.minScreenSize !== undefined) {
      queryConditions.push('screen_size >= $' + (queryParams.length + 1));
      queryParams.push(filter.minScreenSize);
    }
    if (filter.maxScreenSize !== undefined) {
      queryConditions.push('screen_size <= $' + (queryParams.length + 1));
      queryParams.push(filter.maxScreenSize);
    }
    if (filter.nfc !== undefined) {
      queryConditions.push('nfc = $' + (queryParams.length + 1));
      queryParams.push(filter.nfc);
    }

    const countQuery = `
      SELECT COUNT(*) FROM phone_variant_view
      WHERE ${queryConditions.join(' AND ')}
    ;`;
    const dataQuery = `
      SELECT * FROM phone_variant_view
      WHERE ${queryConditions.join(' AND ')}
      ORDER BY variant_id ASC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    ;`;

    queryParams.push(paging.limit, skip);

    const rawCount = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      countQuery,
      ...queryParams.slice(0, -2),
    );
    if (!Array.isArray(rawCount)) throw new Error('Invalid count result');
    const countResult = rawCount as { count: bigint }[];

    const rawData = await this.prisma.$queryRawUnsafe<PhoneVariantViewDto[]>(
      dataQuery,
      ...queryParams,
    );

    if (!this.isPhoneVariantViewDtoArray(rawData)) {
      throw new Error('Invalid variant result');
    }
    const variantResults = rawData;

    const total = Number(countResult[0]?.count ?? 0);
    const variantIds = variantResults.map((v) => v.variant_id);
    const variants = await this.findVariantsByIds(variantIds);

    return { data: variants, paging, total };
  }

  async insertPhoneVariant(variant: PhoneVariant): Promise<PhoneVariant> {
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        create: (params: { data: any }) => Promise<PrismaPhoneVariant>;
      };
    };
    const createdVariant = await prismaService.phoneVariant.create({
      data: variant,
    });
    return this._toPhoneVariantModel(createdVariant);
  }

  async updatePhoneVariant(
    id: number,
    data: PhoneVariantUpdatePrisma,
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        update: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.phoneVariant.update({
      where: { id },
      data,
    });
  }

  async softDeletePhoneVariantsByIds(ids: number[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.phoneVariant.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });
  }

  // Review

  async findReviewsByVariantIds(variantIds: number[]): Promise<Review[]> {
    const prismaService = this.prisma as unknown as {
      review: {
        findMany: (params: { where: any }) => Promise<PrismaReview[]>;
      };
    };
    const reviews = await prismaService.review.findMany({
      where: {
        variantId: { in: variantIds },
        isDeleted: false,
      },
    });
    return reviews.map((review) => this._toReviewModel(review));
  }

  async softDeleteReviewsByVariantIds(variantIds: number[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      review: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.review.updateMany({
      where: { variantId: { in: variantIds } },
      data: { isDeleted: true },
    });
  }

  // Color

  async findColorsByIds(ids: number[]): Promise<Color[]> {
    const prismaService = this.prisma as unknown as {
      color: {
        findMany: (params: { where: any }) => Promise<PrismaColor[]>;
      };
    };
    const colors = await prismaService.color.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
    });
    return colors.map((color) => this._toColorModel(color));
  }

  async findAllColors(): Promise<Color[]> {
    const prismaService = this.prisma as unknown as {
      color: {
        findMany: (params: { where: any }) => Promise<PrismaColor[]>;
      };
    };
    const colors = await prismaService.color.findMany({
      where: { isDeleted: false },
    });
    return colors.map((color) => this._toColorModel(color));
  }

  async insertColor(color: Color): Promise<Color> {
    const prismaService = this.prisma as unknown as {
      color: {
        create: (params: { data: any }) => Promise<PrismaColor>;
      };
    };
    const createdColor = await prismaService.color.create({ data: color });
    return this._toColorModel(createdColor);
  }

  // Variant Price

  async findPricesByVariantIds(variantIds: number[]): Promise<VariantPrice[]> {
    const prismaService = this.prisma as unknown as {
      variantPrice: {
        findMany: (params: { where: any }) => Promise<PrismaVariantPrice[]>;
      };
    };
    const prices = await prismaService.variantPrice.findMany({
      where: {
        variantId: { in: variantIds },
        endDate: null,
      },
    });
    return prices.map((price) => this._toVariantPriceModel(price));
  }

  async insertVariantPrice(variantPrice: VariantPrice): Promise<VariantPrice> {
    const prismaService = this.prisma as unknown as {
      variantPrice: {
        create: (params: { data: any }) => Promise<PrismaVariantPrice>;
      };
    };
    const createdPrice = await prismaService.variantPrice.create({
      data: variantPrice,
    });
    return this._toVariantPriceModel(createdPrice);
  }

  async updateVariantPrice(
    id: number,
    data: VariantPriceUpdateDto,
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantPrice: {
        update: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantPrice.update({
      where: { id },
      data,
    });
  }

  async softDeleteVariantPricesByVariantIds(
    variantIds: number[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantPrice: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantPrice.updateMany({
      where: { variantId: { in: variantIds } },
      data: { isDeleted: true },
    });
  }

  // Variant Discount

  async findDiscountsByVariantIds(
    variantIds: number[],
  ): Promise<VariantDiscount[]> {
    const prismaService = this.prisma as unknown as {
      variantDiscount: {
        findMany: (params: { where: any }) => Promise<PrismaVariantDiscount[]>;
      };
    };
    const discounts = await prismaService.variantDiscount.findMany({
      where: {
        variantId: { in: variantIds },
        endDate: null,
      },
    });
    return discounts.map((discount) => this._toVariantDiscountModel(discount));
  }

  async insertVariantDiscount(
    variantDiscount: VariantDiscount,
  ): Promise<VariantDiscount> {
    const prismaService = this.prisma as unknown as {
      variantDiscount: {
        create: (params: { data: any }) => Promise<PrismaVariantDiscount>;
      };
    };
    const createdDiscount = await prismaService.variantDiscount.create({
      data: variantDiscount,
    });
    return this._toVariantDiscountModel(createdDiscount);
  }

  async updateVariantDiscount(
    id: number,
    data: VariantDiscountUpdateDto,
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantDiscount: {
        update: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantDiscount.update({
      where: { id },
      data,
    });
  }

  async softDeleteVariantDiscountsByVariantIds(
    variantIds: number[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantDiscount: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantDiscount.updateMany({
      where: { variantId: { in: variantIds } },
      data: { isDeleted: true },
    });
  }

  // Image

  async findImagesByIds(ids: number[]): Promise<Image[]> {
    const prismaService = this.prisma as unknown as {
      image: {
        findMany: (params: { where: any }) => Promise<PrismaImage[]>;
      };
    };
    const images = await prismaService.image.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
    });
    return images.map((image) => this._toImageModel(image));
  }

  async insertImage(image: Image): Promise<Image> {
    const prismaService = this.prisma as unknown as {
      image: {
        create: (params: { data: any }) => Promise<PrismaImage>;
      };
    };
    const createdImage = await prismaService.image.create({ data: image });
    return this._toImageModel(createdImage);
  }

  async deleteImage(id: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      image: {
        delete: (params: { where: any }) => Promise<void>;
      };
    };
    await prismaService.image.delete({ where: { id } });
  }

  async deleteImagesByIds(ids: number[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      image: {
        deleteMany: (params: { where: any }) => Promise<void>;
      };
    };
    await prismaService.image.deleteMany({ where: { id: { in: ids } } });
  }

  async softDeleteImagesByIds(ids: number[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      image: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.image.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });
  }

  // Variant Color

  async findVariantColorsByVariantIds(
    variantIds: number[],
  ): Promise<VariantColor[]> {
    const prismaService = this.prisma as unknown as {
      variantColor: {
        findMany: (params: { where: any }) => Promise<PrismaVariantColor[]>;
      };
    };
    const variantColors = await prismaService.variantColor.findMany({
      where: {
        variantId: { in: variantIds },
        isDeleted: false,
      },
    });
    return variantColors.map((variantColor) =>
      this._toVariantColorModel(variantColor),
    );
  }

  async insertVariantColors(variantColors: VariantColor[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantColor: {
        createMany: (params: { data: any[] }) => Promise<void>;
      };
    };
    await prismaService.variantColor.createMany({ data: variantColors });
  }

  async updateVariantColorByVariantIdAndColorId(
    variantId: number,
    colorId: number,
    data: VariantColorUpdatePrisma,
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantColor: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantColor.updateMany({
      where: {
        variantId,
        colorId,
      },
      data,
    });
  }

  async deleteVariantColorByVariantIdAndColorId(
    variantId: number,
    colorId: number,
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantColor: {
        deleteMany: (params: { where: any }) => Promise<void>;
      };
    };
    await prismaService.variantColor.deleteMany({
      where: {
        variantId,
        colorId,
      },
    });
  }

  async softDeleteVariantColorsByVariantIds(
    variantIds: number[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantColor: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantColor.updateMany({
      where: { variantId: { in: variantIds } },
      data: { isDeleted: true },
    });
  }

  // Specification

  async findSpecificationByIds(ids: number[]): Promise<Specification[]> {
    const prismaService = this.prisma as unknown as {
      specification: {
        findMany: (params: { where: any }) => Promise<PrismaSpecification[]>;
      };
    };
    const specifications = await prismaService.specification.findMany({
      where: {
        id: {
          in: ids,
        },
        isDeleted: false,
      },
    });
    return specifications.map((specification) =>
      this._toSpecificationModel(specification),
    );
  }

  async findAllSpecifications(): Promise<Specification[]> {
    const prismaService = this.prisma as unknown as {
      specification: {
        findMany: (params: { where: any }) => Promise<PrismaSpecification[]>;
      };
    };
    const specifications = await prismaService.specification.findMany({
      where: { isDeleted: false },
    });
    return specifications.map((specification) =>
      this._toSpecificationModel(specification),
    );
  }

  async insertSpecification(
    specification: Specification,
  ): Promise<Specification> {
    const prismaService = this.prisma as unknown as {
      specification: {
        create: (params: { data: any }) => Promise<PrismaSpecification>;
      };
    };
    const createdSpecification = await prismaService.specification.create({
      data: specification,
    });
    return this._toSpecificationModel(createdSpecification);
  }

  // Variant Image

  async findVariantImagesByVariantIds(
    variantIds: number[],
  ): Promise<VariantImage[]> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        findMany: (params: { where: any }) => Promise<PrismaVariantImage[]>;
      };
    };
    const variantImages = await prismaService.variantImage.findMany({
      where: {
        variantId: { in: variantIds },
        isDeleted: false,
      },
    });
    return variantImages.map((variantImage) =>
      this._toVariantImageModel(variantImage),
    );
  }

  async findVariantImagesByIds(ids: number[]): Promise<VariantImage[]> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        findMany: (params: { where: any }) => Promise<PrismaVariantImage[]>;
      };
    };
    const variantImages = await prismaService.variantImage.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
    });

    return variantImages.map((variantImage) =>
      this._toVariantImageModel(variantImage),
    );
  }

  async insertVariantImages(variantImages: VariantImage[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        createMany: (params: { data: any[] }) => Promise<void>;
      };
    };
    await prismaService.variantImage.createMany({ data: variantImages });
  }

  updateVariantImage(id: number, imageId: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        update: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    return prismaService.variantImage.update({
      where: { id },
      data: { imageId },
    });
  }

  async deleteVariantImage(id: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        delete: (params: { where: any }) => Promise<void>;
      };
    };
    await prismaService.variantImage.delete({ where: { id } });
  }

  async softDeleteVariantImagesByVariantIds(
    variantIds: number[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantImage.updateMany({
      where: { variantId: { in: variantIds } },
      data: { isDeleted: true },
    });
  }

  // Variant Specification

  async findSpecificationsByVariantIds(
    variantIds: number[],
  ): Promise<VariantSpecification[]> {
    const prismaService = this.prisma as unknown as {
      variantSpecification: {
        findMany: (params: {
          where: any;
        }) => Promise<PrismaVariantSpecification[]>;
      };
    };
    const specifications = await prismaService.variantSpecification.findMany({
      where: {
        variantId: { in: variantIds },
        isDeleted: false,
      },
    });
    return specifications.map((specification) =>
      this._toVariantSpecificationModel(specification),
    );
  }

  async insertVariantSpecifications(
    variantSpecifications: VariantSpecification[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantSpecification: {
        createMany: (params: { data: any[] }) => Promise<void>;
      };
    };
    await prismaService.variantSpecification.createMany({
      data: variantSpecifications,
    });
  }

  async updateVariantSpecificationByVariantIdAndSpecId(
    variantId: number,
    specId: number,
    data: VariantSpecificationUpdatePrisma,
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantSpecification: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantSpecification.updateMany({
      where: {
        variantId,
        specId,
      },
      data,
    });
  }

  async deleteVariantSpecificationByVariantIdAndSpecId(
    variantId: number,
    specId: number,
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantSpecification: {
        deleteMany: (params: { where: any }) => Promise<void>;
      };
    };
    await prismaService.variantSpecification.deleteMany({
      where: {
        variantId,
        specId,
      },
    });
  }

  async softDeleteVariantSpecificationsByVariantIds(
    variantIds: number[],
  ): Promise<void> {
    const prismaService = this.prisma as unknown as {
      variantSpecification: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.variantSpecification.updateMany({
      where: { variantId: { in: variantIds } },
      data: { isDeleted: true },
    });
  }

  // Phone

  async findPhonesByIds(ids: number[]): Promise<Phone[]> {
    const prismaService = this.prisma as unknown as {
      phone: {
        findMany: (params: { where: any }) => Promise<PrismaPhone[]>;
      };
    };
    const phones = await prismaService.phone.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
    });
    return phones.map((phone) => this._toPhoneModel(phone));
  }

  async listPhones(paging: PagingDto): Promise<Paginated<Phone>> {
    const skip = (paging.page - 1) * paging.limit;
    const prismaService = this.prisma as unknown as {
      phone: {
        count: (params: { where: any }) => Promise<number>;
        findMany: (params: {
          where: any;
          skip: number;
          take: number;
          orderBy: any;
        }) => Promise<PrismaPhone[]>;
      };
    };
    const total = await prismaService.phone.count({
      where: { isDeleted: false },
    });
    const phones = await prismaService.phone.findMany({
      where: { isDeleted: false },
      skip,
      take: paging.limit,
      orderBy: { id: 'asc' },
    });
    return {
      data: phones.map((phone) => this._toPhoneModel(phone)),
      paging,
      total,
    };
  }

  async findPhonesByBrandId(brandId: number): Promise<Phone[]> {
    const prismaService = this.prisma as unknown as {
      phone: {
        findMany: (params: { where: any }) => Promise<PrismaPhone[]>;
      };
    };
    const phones = await prismaService.phone.findMany({
      where: {
        brandId: brandId,
        isDeleted: false,
      },
    });
    return phones.map((phone) => this._toPhoneModel(phone));
  }

  async findPhonesByCategoryId(categoryId: number): Promise<Phone[]> {
    const prismaService = this.prisma as unknown as {
      phone: {
        findMany: (params: { where: any }) => Promise<PrismaPhone[]>;
      };
    };
    const phones = await prismaService.phone.findMany({
      where: {
        categoryId: categoryId,
        isDeleted: false,
      },
    });
    return phones.map((phone) => this._toPhoneModel(phone));
  }

  async findPhonesByCategoryIds(categoryIds: number[]): Promise<Phone[]> {
    const prismaService = this.prisma as unknown as {
      phone: {
        findMany: (params: { where: any }) => Promise<PrismaPhone[]>;
      };
    };
    const phones = await prismaService.phone.findMany({
      where: {
        categoryId: { in: categoryIds },
        isDeleted: false,
      },
    });
    return phones.map((phone) => this._toPhoneModel(phone));
  }

  async insertPhone(phone: Phone): Promise<Phone> {
    const prismaService = this.prisma as unknown as {
      phone: {
        create: (params: { data: any }) => Promise<PrismaPhone>;
      };
    };
    const createdPhone = await prismaService.phone.create({ data: phone });
    return this._toPhoneModel(createdPhone);
  }

  async updatePhone(id: number, data: PhoneUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      phone: {
        update: (params: { where: { id: number }; data: any }) => Promise<void>;
      };
    };
    await prismaService.phone.update({
      where: { id },
      data,
    });
  }

  async softDeletePhonesByIds(ids: number[]): Promise<void> {
    const prismaService = this.prisma as unknown as {
      phone: {
        updateMany: (params: { where: any; data: any }) => Promise<void>;
      };
    };
    await prismaService.phone.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });
  }

  // Inventory

  async findInventoryById(id: number): Promise<Inventory | null> {
    const prismaService = this.prisma as unknown as {
      inventory: {
        findFirst: (params: { where: any }) => Promise<PrismaInventory | null>;
      };
    };
    const inventory = await prismaService.inventory.findFirst({
      where: { id: id, isDeleted: false },
    });
    if (!inventory) {
      return null;
    }
    return this._toInventoryModel(inventory);
  }

  async findInventoryBySku(sku: string): Promise<Inventory | null> {
    const prismaService = this.prisma as unknown as {
      inventory: {
        findFirst: (params: { where: any }) => Promise<PrismaInventory | null>;
      };
    };
    const inventory = await prismaService.inventory.findFirst({
      where: { sku: sku, isDeleted: false },
    });
    if (!inventory) {
      return null;
    }
    return this._toInventoryModel(inventory);
  }

  async findInventoriesByVariantIds(
    variantIds: number[],
  ): Promise<Inventory[]> {
    const prismaService = this.prisma as unknown as {
      inventory: {
        findMany: (params: { where: any }) => Promise<PrismaInventory[]>;
      };
    };
    const inventories = await prismaService.inventory.findMany({
      where: { variantId: { in: variantIds }, isDeleted: false },
    });
    return inventories.map((inventory) => this._toInventoryModel(inventory));
  }

  async findInventoryByVariantIdAndColorId(
    variantId: number,
    colorId: number,
  ): Promise<Inventory | null> {
    const prismaService = this.prisma as unknown as {
      inventory: {
        findFirst: (params: { where: any }) => Promise<PrismaInventory | null>;
      };
    };
    const inventory = await prismaService.inventory.findFirst({
      where: { variantId, colorId, isDeleted: false },
    });
    if (!inventory) {
      return null;
    }
    return this._toInventoryModel(inventory);
  }

  async updateInventory(id: number, data: InventoryUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      inventory: {
        update: (params: {
          where: { id: number };
          data: any;
        }) => Promise<PrismaInventory>;
      };
    };
    await prismaService.inventory.update({
      where: { id },
      data,
    });
  }

  private isFilterEmpty(filter: PhoneFilterDto): boolean {
    if (!filter) return true;
    return Object.values(filter).every((value) => value === undefined);
  }

  private isPhoneVariantViewDtoArray(
    data: unknown,
  ): data is PhoneVariantViewDto[] {
    return (
      Array.isArray(data) &&
      data.every(
        (item) =>
          typeof item === 'object' && item !== null && 'variant_id' in item,
      )
    );
  }

  private _toPhoneModel(data: PrismaPhone): Phone {
    return {
      id: data.id,
      name: data.name,
      brandId: data.brandId,
      categoryId: data.categoryId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toBrandModel(data: PrismaBrand): Brand {
    return {
      id: data.id,
      name: data.name,
      imageId: data.imageId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toCategoryModel(data: PrismaCategory): Category {
    return {
      id: data.id,
      name: data.name,
      parentId: data.parentId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toPhoneVariantModel(data: PrismaPhoneVariant): PhoneVariant {
    return {
      id: data.id,
      phoneId: data.phoneId,
      variantName: data.variantName,
      description: data.description,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toReviewModel(data: PrismaReview): Review {
    return {
      id: data.id,
      orderId: data.orderId,
      customerId: data.customerId,
      variantId: data.variantId,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toColorModel(data: PrismaColor): Color {
    return {
      id: data.id,
      name: data.name,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toVariantPriceModel(data: PrismaVariantPrice): VariantPrice {
    return {
      id: data.id,
      variantId: data.variantId,
      price:
        data.price instanceof Decimal
          ? data.price.toNumber()
          : Number(data.price),
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toVariantDiscountModel(
    data: PrismaVariantDiscount,
  ): VariantDiscount {
    return {
      id: data.id,
      variantId: data.variantId,
      discountPercent:
        data.discountPercent instanceof Decimal
          ? data.discountPercent.toNumber()
          : Number(data.discountPercent),
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toVariantImageModel(data: PrismaVariantImage): VariantImage {
    return {
      id: data.id,
      variantId: data.variantId,
      imageId: data.imageId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toVariantSpecificationModel(
    data: PrismaVariantSpecification,
  ): VariantSpecification {
    return {
      variantId: data.variantId,
      specId: data.specId,
      info: data.info,
      valueNumeric: data.valueNumeric,
      unit: data.unit,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toSpecificationModel(data: PrismaSpecification): Specification {
    return {
      id: data.id,
      name: data.name,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toInventoryModel(data: PrismaInventory): Inventory {
    return {
      id: data.id,
      variantId: data.variantId,
      colorId: data.colorId,
      sku: data.sku,
      stockQuantity: data.stockQuantity,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toImageModel(data: PrismaImage): Image {
    return {
      id: data.id,
      imageUrl: data.imageUrl,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toVariantColorModel(data: PrismaVariantColor): VariantColor {
    return {
      variantId: data.variantId,
      colorId: data.colorId,
      imageId: data.imageId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }
}
