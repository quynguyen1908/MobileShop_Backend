import { Paginated, PagingDto } from '@app/contracts';
import {
  BrandCreateDto,
  BrandDto,
  CategoryCreateDto,
  InventoryUpdateDto,
  PhoneCreateDto,
  PhoneVariantCreateDto,
  VariantDiscountUpdateDto,
  VariantPriceUpdateDto,
} from '@app/contracts/phone';
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
  createPhone(phoneCreateDto: PhoneCreateDto): Promise<number>;

  // Brand
  getAllBrands(): Promise<BrandDto[]>;
  createBrand(brandCreateDto: BrandCreateDto): Promise<number>;

  // Category
  getAllCategories(): Promise<CategoryDto[]>;
  createCategory(categoryCreateDto: CategoryCreateDto): Promise<number>;

  // Color
  getAllColors(): Promise<Color[]>;
  createColor(name: string): Promise<number>;

  // Phone Variant
  getVariantById(id: number): Promise<PhoneVariantDto>;
  getVariantsByIds(ids: number[]): Promise<PhoneVariantDto[]>;
  listPhoneVariants(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneVariantDto>>;
  getRelatedVariants(variantId: number): Promise<PhoneVariantDto[]>;
  createPhoneVariant(
    phoneId: number,
    phoneVariantCreateDto: PhoneVariantCreateDto,
  ): Promise<number>;

  // Image
  getImagesByIds(ids: number[]): Promise<Image[]>;

  // Specification
  getAllSpecifications(): Promise<Specification[]>;
  createSpecification(name: string): Promise<number>;

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
  updateInventory(id: number, data: InventoryUpdateDto): Promise<void>;
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
  findAllColors(): Promise<Color[]>;

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
  findAllSpecifications(): Promise<Specification[]>;

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
  // Image
  insertImage(image: Image): Promise<Image>;

  // Brand
  insertBrand(brand: Brand): Promise<Brand>;

  // Category
  insertCategory(category: Category): Promise<Category>;

  // Phone
  insertPhone(phone: Phone): Promise<Phone>;

  // Color
  insertColor(color: Color): Promise<Color>;

  // Phone Variant
  insertPhoneVariant(variant: PhoneVariant): Promise<PhoneVariant>;

  // Variant Color
  insertVariantColors(variantColors: VariantColor[]): Promise<void>;

  // Variant Price
  insertVariantPrice(variantPrice: VariantPrice): Promise<VariantPrice>;
  updateVariantPrice(id: number, data: VariantPriceUpdateDto): Promise<void>;

  // Variant Discount
  insertVariantDiscount(
    variantDiscount: VariantDiscount,
  ): Promise<VariantDiscount>;
  updateVariantDiscount(
    id: number,
    data: VariantDiscountUpdateDto,
  ): Promise<void>;

  // Variant Image
  insertVariantImages(variantImages: VariantImage[]): Promise<void>;

  // Specification
  insertSpecification(specification: Specification): Promise<Specification>;

  // Variant Specification
  insertVariantSpecifications(
    variantSpecifications: VariantSpecification[],
  ): Promise<void>;

  // Inventory
  updateInventory(id: number, data: InventoryUpdateDto): Promise<void>;
}
