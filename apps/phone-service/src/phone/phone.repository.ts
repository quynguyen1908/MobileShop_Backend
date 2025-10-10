import { Injectable } from '@nestjs/common';
import { IPhoneQueryRepository } from './phone.port';
import { PhonePrismaService } from '@app/contracts/prisma';
import {
  Brand,
  Category,
  Color,
  Phone,
  PhoneFilterDto,
  PhoneVariant,
  PhoneVariantViewDto,
  Review,
  Specification,
  VariantDiscount,
  VariantImage,
  VariantPrice,
  VariantSpecification,
} from '@app/contracts/phone';
import { Decimal } from '@prisma/client/runtime/library';
import { Paginated, PagingDto } from '@app/contracts';

interface PrismaPhone {
  id: number;
  name: string;
  brandId: number;
  categoryId: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaBrand {
  id: number;
  name: string;
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

interface PrismaPhoneVariant {
  id: number;
  phoneId: number;
  variantName: string;
  colorId: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  prices?: PrismaVariantPrice[];
  discounts?: PrismaVariantDiscount[];
  specifications?: PrismaVariantSpecification[];
}

interface PrismaReview {
  id: number;
  orderId: number;
  customerId: number;
  phoneId: number;
  rating: number;
  comment: string | null;
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
  imageUrl: string;
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
  specification?: PrismaSpecification;
}

interface PrismaSpecification {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

@Injectable()
export class PhoneRepository implements IPhoneQueryRepository {
  constructor(private prisma: PhonePrismaService) {}

  async findPhoneById(id: number): Promise<Phone | null> {
    const prismaService = this.prisma as unknown as {
      phone: {
        findUnique: (params: {
          where: { id: number };
        }) => Promise<PrismaPhone | null>;
      };
    };
    const phone = await prismaService.phone.findUnique({ where: { id } });
    if (!phone || phone.isDeleted) {
      return null;
    }
    return this._toPhoneModel(phone);
  }

  async findBrandById(id: number): Promise<Brand | null> {
    const prismaService = this.prisma as unknown as {
      brand: {
        findUnique: (params: {
          where: { id: number };
        }) => Promise<PrismaBrand | null>;
      };
    };
    const brand = await prismaService.brand.findUnique({ where: { id } });
    if (!brand || brand.isDeleted) {
      return null;
    }
    return this._toBrandModel(brand);
  }

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

  async findCategoryById(id: number): Promise<Category | null> {
    const prismaService = this.prisma as unknown as {
      category: {
        findUnique: (params: {
          where: { id: number };
        }) => Promise<PrismaCategory | null>;
      };
    };
    const category = await prismaService.category.findUnique({ where: { id } });
    if (!category || category.isDeleted) {
      return null;
    }
    return this._toCategoryModel(category);
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

  async findReviewsByPhoneId(phoneId: number): Promise<Review[]> {
    const prismaService = this.prisma as unknown as {
      review: {
        findMany: (params: { where: any }) => Promise<PrismaReview[]>;
      };
    };
    const reviews = await prismaService.review.findMany({
      where: {
        phoneId: phoneId,
        isDeleted: false,
      },
    });
    return reviews.map((review) => this._toReviewModel(review));
  }

  async findReviewsByPhoneIds(phoneIds: number[]): Promise<Review[]> {
    const prismaService = this.prisma as unknown as {
      review: {
        findMany: (params: { where: any }) => Promise<PrismaReview[]>;
      };
    };
    const reviews = await prismaService.review.findMany({
      where: {
        phoneId: { in: phoneIds },
        isDeleted: false,
      },
    });
    return reviews.map((review) => this._toReviewModel(review));
  }

  async findColorById(id: number): Promise<Color | null> {
    const prismaService = this.prisma as unknown as {
      color: {
        findFirst: (params: { where: any }) => Promise<PrismaColor | null>;
      };
    };
    const color = await prismaService.color.findFirst({
      where: { id: id },
    });
    if (!color || color.isDeleted) {
      return null;
    }
    return this._toColorModel(color);
  }

  async findColorsByIds(ids: number[]): Promise<Color[]> {
    const prismaService = this.prisma as unknown as {
      color: {
        findMany: (params: { where: any }) => Promise<PrismaColor[]>;
      };
    };
    const colors = await prismaService.color.findMany({
      where: { id: { in: ids }, isDeleted: false },
    });
    return colors.map((color) => this._toColorModel(color));
  }

  async findPriceByVariantId(variantId: number): Promise<VariantPrice | null> {
    const prismaService = this.prisma as unknown as {
      variantPrice: {
        findFirst: (params: {
          where: any;
        }) => Promise<PrismaVariantPrice | null>;
      };
    };
    const price = await prismaService.variantPrice.findFirst({
      where: {
        variantId: variantId,
        endDate: null,
      },
    });
    if (!price || price.isDeleted) {
      return null;
    }
    return this._toVariantPriceModel(price);
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

  async findDiscountByVariantId(
    variantId: number,
  ): Promise<VariantDiscount | null> {
    const prismaService = this.prisma as unknown as {
      variantDiscount: {
        findFirst: (params: {
          where: any;
        }) => Promise<PrismaVariantDiscount | null>;
      };
    };
    const discount = await prismaService.variantDiscount.findFirst({
      where: {
        variantId: variantId,
        endDate: null,
      },
    });
    if (!discount || discount.isDeleted) {
      return null;
    }
    return this._toVariantDiscountModel(discount);
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

  async findImagesByVariantId(variantId: number): Promise<VariantImage[]> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        findMany: (params: { where: any }) => Promise<PrismaVariantImage[]>;
      };
    };
    const images = await prismaService.variantImage.findMany({
      where: {
        variantId: variantId,
        isDeleted: false,
      },
    });
    return images.map((image) => this._toVariantImageModel(image));
  }

  async findImagesByVariantIds(variantIds: number[]): Promise<VariantImage[]> {
    const prismaService = this.prisma as unknown as {
      variantImage: {
        findMany: (params: { where: any }) => Promise<PrismaVariantImage[]>;
      };
    };
    const images = await prismaService.variantImage.findMany({
      where: {
        variantId: { in: variantIds },
        isDeleted: false,
      },
    });
    return images.map((image) => this._toVariantImageModel(image));
  }

  async findSpecificationsByVariantId(
    variantId: number,
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
        variantId: variantId,
        isDeleted: false,
      },
    });
    return specifications.map((specification) =>
      this._toVariantSpecificationModel(specification),
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
    if (!Array.isArray(rawData)) throw new Error('Invalid variant result');
    const variantResults = rawData as PhoneVariantViewDto[];

    const total = Number(countResult[0]?.count ?? 0);
    const variantIds = variantResults.map((v) => v.variant_id);
    const variants = await this.findVariantsByIds(variantIds);

    return { data: variants, paging, total };
  }

  private isFilterEmpty(filter: PhoneFilterDto): boolean {
    if (!filter) return true;
    return Object.values(filter).every((value) => value === undefined);
  }

  private _toPhoneModel(data: PrismaPhone): Phone {
    return {
      id: data.id,
      name: data.name,
      brandId: data.brandId,
      categoryId: data.categoryId,
      description: data.description,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }

  private _toBrandModel(data: PrismaBrand): Brand {
    return {
      id: data.id,
      name: data.name,
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
      colorId: data.colorId,
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
      phoneId: data.phoneId,
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
      imageUrl: data.imageUrl,
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
}
