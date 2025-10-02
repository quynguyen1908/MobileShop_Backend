import { Injectable } from '@nestjs/common';
import { IPhoneQueryRepository } from './phone.port';
import { PhonePrismaService } from '@app/contracts/prisma';
import {
  Brand,
  Category,
  Color,
  Phone,
  PhoneVariant,
  Review,
  Specification,
  VariantDiscount,
  VariantImage,
  VariantPrice,
  VariantSpecification,
} from '@app/contracts/phone';
import { Decimal } from '.prisma/client/phone/runtime/library';

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
      price: data.price.toNumber(),
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
      discountPercent: data.discountPercent.toNumber(),
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
