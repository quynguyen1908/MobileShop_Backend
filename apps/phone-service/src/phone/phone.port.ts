import { Paginated, PagingDto } from '@app/contracts';
import {
  Brand,
  Category,
  CategoryDto,
  Color,
  Phone,
  PhoneDto,
  PhoneFilterDto,
  PhoneVariant,
  VariantDto,
  Review,
  Specification,
  VariantDiscount,
  VariantImage,
  VariantPrice,
  VariantSpecification,
} from '@app/contracts/phone';

export interface IPhoneService {
  // Phone
  getPhone(id: number): Promise<PhoneDto>;
  listPhones(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneDto>>;
  getPhonesByIds(ids: number[]): Promise<Phone[]>;

  // Category
  getAllCategories(): Promise<CategoryDto[]>;

  // Phone Variant
  getVariantsByIds(ids: number[]): Promise<VariantDto[]>;
}

export interface IPhoneQueryRepository {
  // Phone
  findPhoneById(id: number): Promise<Phone | null>;
  findPhoneByIds(ids: number[]): Promise<Phone[]>;

  // Brand
  findBrandById(id: number): Promise<Brand | null>;
  findBrandsByIds(ids: number[]): Promise<Brand[]>;

  // Category
  findCategoryById(id: number): Promise<Category | null>;
  findCategoriesByIds(ids: number[]): Promise<Category[]>;
  findAllCategories(): Promise<Category[]>;

  // Phone Variant
  findVariantsByPhoneId(phoneId: number): Promise<PhoneVariant[]>;
  listPhoneVariants(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneVariant>>;
  findVariantsByIds(ids: number[]): Promise<PhoneVariant[]>;

  // Review
  findReviewsByPhoneId(phoneId: number): Promise<Review[]>;
  findReviewsByPhoneIds(phoneIds: number[]): Promise<Review[]>;

  // Color
  findColorByVariantId(variantId: number): Promise<Color | null>;
  findColorsByVariantIds(variantIds: number[]): Promise<Color[]>;

  // Variant Price
  findPriceByVariantId(variantId: number): Promise<VariantPrice | null>;
  findPricesByVariantIds(variantIds: number[]): Promise<VariantPrice[]>;

  // Variant Discount
  findDiscountByVariantId(variantId: number): Promise<VariantDiscount | null>;
  findDiscountsByVariantIds(variantIds: number[]): Promise<VariantDiscount[]>;

  // Variant Image
  findImagesByVariantId(variantId: number): Promise<VariantImage[]>;
  findImagesByVariantIds(variantIds: number[]): Promise<VariantImage[]>;

  // Variant Specification
  findSpecificationsByVariantId(
    variantId: number,
  ): Promise<VariantSpecification[]>;
  findSpecificationsByVariantIds(
    variantIds: number[],
  ): Promise<VariantSpecification[]>;

  // Specification
  findSpecificationByIds(ids: number[]): Promise<Specification[]>;
}
