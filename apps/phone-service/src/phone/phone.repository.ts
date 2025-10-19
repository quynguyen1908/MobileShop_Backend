/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IPhoneRepository } from './phone.port';
import { PhonePrismaService } from '@app/contracts/prisma';
import {
  Brand,
  Category,
  Color,
  Image,
  Inventory,
  Phone,
  PhoneFilterDto,
  PhoneVariant,
  PhoneVariantViewDto,
  Review,
  Specification,
  VariantColor,
  VariantDiscount,
  VariantImage,
  VariantPrice,
  VariantSpecification,
} from '@app/contracts/phone';
import { Decimal } from '@prisma/client/runtime/library';
import { Paginated, PagingDto } from '@app/contracts';
import { UpdateInventoryDto } from '@app/contracts/phone';

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

  async findPhoneByIds(ids: number[]): Promise<Phone[]> {
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

  async updateInventory(id: number, data: UpdateInventoryDto): Promise<void> {
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
