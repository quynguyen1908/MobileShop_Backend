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
  Review,
  Specification,
  VariantDiscount,
  VariantImage,
  VariantPrice,
  VariantSpecification,
} from '@app/contracts/phone';
import { Decimal } from '@prisma/client/runtime/library';
import { Paginated, PagingDto } from '@app/contracts';
import { normalizeStorage } from '@app/contracts/utils';

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

  async findColorByVariantId(variantId: number): Promise<Color | null> {
    const prismaService = this.prisma as unknown as {
      color: {
        findFirst: (params: { where: any }) => Promise<PrismaColor | null>;
      };
    };
    const color = await prismaService.color.findFirst({
      where: { id: variantId },
    });
    if (!color || color.isDeleted) {
      return null;
    }
    return this._toColorModel(color);
  }

  async findColorsByVariantIds(variantIds: number[]): Promise<Color[]> {
    const prismaService = this.prisma as unknown as {
      color: {
        findMany: (params: { where: any }) => Promise<PrismaColor[]>;
      };
    };
    const colors = await prismaService.color.findMany({
      where: { id: { in: variantIds }, isDeleted: false },
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
    const includeCondition = {
      prices: {
        where: {
          startDate: { lte: new Date() },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
      discounts: {
        where: {
          startDate: { lte: new Date() },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
      specifications: {
        include: {
          specification: true,
        },
      },
    };

    const prismaService = this.prisma as unknown as {
      phoneVariant: {
        findMany: (params: {
          where: any;
          include: any;
          take: number;
          skip: number;
          orderBy: any;
        }) => Promise<PrismaPhoneVariant[]>;
      };
    };

    const data = await prismaService.phoneVariant.findMany({
      where: { isDeleted: false },
      include: includeCondition,
      take: paging.limit,
      skip,
      orderBy: { id: 'asc' },
    });

    const isFilterEmpty = this.isFilterEmpty(filter);
    if (isFilterEmpty) {
      const total = data.length;
      return {
        data: data.map((variant) => this._toPhoneVariantModel(variant)),
        paging,
        total,
      };
    }

    const filteredData = data.filter((variant) => {
      const price =
        variant.prices && variant.prices[0]?.price !== undefined
          ? Number(variant.prices[0].price)
          : 0;
      const discount =
        variant.discounts && variant.discounts[0]?.discountPercent !== undefined
          ? Number(variant.discounts[0].discountPercent)
          : 0;
      const finalPrice = price - Math.floor((price * discount) / 100);

      if (filter.minPrice !== undefined && finalPrice < filter.minPrice)
        return false;
      if (filter.maxPrice !== undefined && finalPrice > filter.maxPrice)
        return false;

      for (const vs of variant.specifications || []) {
        const specName = vs.specification?.name.toLowerCase();
        const info = vs.info.toLowerCase();

        if (specName?.includes('chipset') && filter.chipset) {
          if (Array.isArray(filter.chipset)) {
            if (
              !filter.chipset.some((chip) => info.includes(chip.toLowerCase()))
            )
              return false;
          } else {
            if (!info.includes(filter.chipset.toLowerCase())) return false;
          }
        }

        if (specName?.includes('hệ điều hành') && filter.os) {
          if (Array.isArray(filter.os)) {
            if (!filter.os.some((os) => info.includes(os.toLowerCase())))
              return false;
          } else {
            if (!info.includes(filter.os.toLowerCase())) return false;
          }
        }

        if (specName?.includes('dung lượng ram')) {
          const ram = parseInt(info);
          if (!isNaN(ram)) {
            if (filter.minRam !== undefined && ram < filter.minRam)
              return false;
            if (filter.maxRam !== undefined && ram > filter.maxRam)
              return false;
          }
        }

        if (specName?.includes('bộ nhớ trong')) {
          const storage = normalizeStorage(info);
          if (storage !== null) {
            if (filter.minStorage !== undefined && storage < filter.minStorage)
              return false;
            if (filter.maxStorage !== undefined && storage > filter.maxStorage)
              return false;
          }
        }

        if (
          specName?.includes('kích thước màn hình') &&
          (filter.minScreenSize !== undefined ||
            filter.maxScreenSize !== undefined)
        ) {
          const screenSize = parseFloat(info);
          if (!isNaN(screenSize)) {
            if (
              filter.minScreenSize !== undefined &&
              screenSize < filter.minScreenSize
            )
              return false;
            if (
              filter.maxScreenSize !== undefined &&
              screenSize > filter.maxScreenSize
            )
              return false;
          }
        }

        if (specName?.includes('công nghệ nfc') && filter.nfc !== undefined) {
          const hasNfc =
            info.includes('có') ||
            info.includes('có hỗ trợ') ||
            info.includes('hỗ trợ');
          if (hasNfc !== filter.nfc) return false;
        }
      }

      return true;
    });

    const total = filteredData.length;

    return {
      data: filteredData.map((variant) => this._toPhoneVariantModel(variant)),
      paging,
      total,
    };
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
