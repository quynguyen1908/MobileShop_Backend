import {
  Brand,
  Category,
  Color,
  Phone,
  PhoneDto,
  PhoneVariant,
  Review,
  Specification,
  VariantDiscount,
  VariantImage,
  VariantPrice,
  VariantSpecification,
} from '@app/contracts/phone';

export interface IPhoneService {
  getPhone(id: number): Promise<PhoneDto>;
}

export interface IPhoneQueryRepository {
  findPhoneById(id: number): Promise<Phone | null>;
  findBrandById(id: number): Promise<Brand | null>;
  findCategoryById(id: number): Promise<Category | null>;
  findVariantsByPhoneId(phoneId: number): Promise<PhoneVariant[]>;
  findReviewsByPhoneId(phoneId: number): Promise<Review[]>;
  findColorByVariantId(variantId: number): Promise<Color | null>;
  findPriceByVariantId(variantId: number): Promise<VariantPrice | null>;
  findDiscountByVariantId(variantId: number): Promise<VariantDiscount | null>;
  findImagesByVariantId(variantId: number): Promise<VariantImage[]>;
  findSpecificationsByVariantId(
    variantId: number,
  ): Promise<VariantSpecification[]>;
  findSpecificationByIds(ids: number[]): Promise<Specification[]>;
}
