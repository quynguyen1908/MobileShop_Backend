import { Paginated, PagingDto } from '@app/contracts';
import { BrandDto, UpdateInventoryDto } from '@app/contracts/phone';
import {
  Brand,
  Category,
  CategoryDto,
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
  Inventory,
  PhoneVariantDto,
  VariantColor,
  Image,
} from '@app/contracts/phone';

export interface IPhoneService {
  // Phone
  getPhonesByIds(ids: number[]): Promise<Phone[]>;

  // Brand
  getAllBrands(): Promise<BrandDto[]>;

  // Category
  getAllCategories(): Promise<CategoryDto[]>;

  // Phone Variant
  getVariantById(id: number): Promise<PhoneVariantDto>;
  getVariantsByIds(ids: number[]): Promise<PhoneVariantDto[]>;
  listPhoneVariants(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneVariantDto>>;
  getRelatedVariants(variantId: number): Promise<PhoneVariantDto[]>;

  // Image
  getImagesByIds(ids: number[]): Promise<Image[]>;

  // Inventory
  getInventoryBySku(sku: string): Promise<Inventory>;
  getInventoryByVariantIdAndColorId(
    variantId: number,
    colorId: number,
  ): Promise<Inventory>;
  checkInventoryAvailability(
    variantId: number,
    colorId: number,
    requiredQuantity: number,
  ): Promise<boolean>;
  updateInventory(id: number, data: UpdateInventoryDto): Promise<void>;
}

export interface IPhoneRepository
  extends IPhoneQueryRepository,
    IPhoneCommandRepository {}

export interface IPhoneQueryRepository {
  // Phone
  findPhoneByIds(ids: number[]): Promise<Phone[]>;

  // Brand
  findBrandsByIds(ids: number[]): Promise<Brand[]>;
  findAllBrands(): Promise<Brand[]>;

  // Category
  findCategoriesByIds(ids: number[]): Promise<Category[]>;
  findAllCategories(): Promise<Category[]>;

  // Phone Variant
  listPhoneVariants(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneVariant>>;
  findVariantsById(id: number): Promise<PhoneVariant | null>;
  findVariantsByIds(ids: number[]): Promise<PhoneVariant[]>;
  findVariantsByPhoneId(phoneId: number): Promise<PhoneVariant[]>;

  // Review
  findReviewsByVariantIds(variantIds: number[]): Promise<Review[]>;

  // Color
  findColorsByIds(ids: number[]): Promise<Color[]>;

  // Variant Color
  findVariantColorsByVariantIds(variantIds: number[]): Promise<VariantColor[]>;

  // Variant Price
  findPricesByVariantIds(variantIds: number[]): Promise<VariantPrice[]>;

  // Variant Discount
  findDiscountsByVariantIds(variantIds: number[]): Promise<VariantDiscount[]>;

  // Image
  findImagesByIds(ids: number[]): Promise<Image[]>;

  // Variant Image
  findVariantImagesByVariantIds(variantIds: number[]): Promise<VariantImage[]>;

  // Variant Specification
  findSpecificationsByVariantIds(
    variantIds: number[],
  ): Promise<VariantSpecification[]>;

  // Specification
  findSpecificationByIds(ids: number[]): Promise<Specification[]>;

  // Inventory
  findInventoryById(id: number): Promise<Inventory | null>;
  findInventoryBySku(sku: string): Promise<Inventory | null>;
  findInventoriesByVariantIds(variantIds: number[]): Promise<Inventory[]>;
  findInventoryByVariantIdAndColorId(
    variantId: number,
    colorId: number,
  ): Promise<Inventory | null>;
}

export interface IPhoneCommandRepository {
  // Inventory
  updateInventory(id: number, data: UpdateInventoryDto): Promise<void>;
}
