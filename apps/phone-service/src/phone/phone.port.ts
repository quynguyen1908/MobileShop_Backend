import { Paginated, PagingDto, Requester } from '@app/contracts';
import {
  BrandCreateDto,
  BrandDto,
  BrandUpdateDto,
  CategoryCreateDto,
  CategoryUpdateDto,
  InventoryUpdateDto,
  PhoneCreateDto,
  PhoneUpdateDto,
  PhoneVariantCreateDto,
  PhoneVariantUpdateDto,
  PhoneVariantUpdatePrisma,
  PhoneWithVariantsDto,
  ReviewCreateDto,
  VariantColorUpdatePrisma,
  VariantDiscountUpdateDto,
  VariantPriceUpdateDto,
  VariantSpecificationUpdatePrisma,
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
  listPhones(paging: PagingDto): Promise<Paginated<PhoneWithVariantsDto>>;
  getPhoneById(id: number): Promise<PhoneWithVariantsDto>;
  createPhone(phoneCreateDto: PhoneCreateDto): Promise<number>;
  updatePhone(id: number, data: PhoneUpdateDto): Promise<void>;
  deletePhonesByIds(ids: number[]): Promise<void>;

  // Brand
  getAllBrands(): Promise<BrandDto[]>;
  createBrand(brandCreateDto: BrandCreateDto): Promise<number>;
  updateBrand(id: number, name?: string, imageUrl?: string): Promise<void>;
  deleteBrand(id: number): Promise<void>;

  // Category
  getAllCategories(): Promise<CategoryDto[]>;
  getCategoriesByIds(ids: number[]): Promise<Category[]>;
  getParentCategoryIdsByVariantIds(variantIds: number[]): Promise<number[]>;
  createCategory(categoryCreateDto: CategoryCreateDto): Promise<number>;
  updateCategory(id: number, data: CategoryUpdateDto): Promise<void>;
  deleteCategory(id: number): Promise<void>;

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
  updatePhoneVariant(id: number, data: PhoneVariantUpdateDto): Promise<void>;
  deletePhoneVariantsByIds(ids: number[]): Promise<void>;

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

  // Review
  createReview(requester: Requester, reviewCreateDto: ReviewCreateDto): Promise<number>;
}

export interface IPhoneRepository
  extends IPhoneQueryRepository,
    IPhoneCommandRepository {}

export interface IPhoneQueryRepository {
  // Phone
  findPhonesByIds(ids: number[]): Promise<Phone[]>;
  listPhones(paging: PagingDto): Promise<Paginated<Phone>>;
  findPhonesByBrandId(brandId: number): Promise<Phone[]>;
  findPhonesByCategoryId(categoryId: number): Promise<Phone[]>;
  findPhonesByCategoryIds(categoryIds: number[]): Promise<Phone[]>;
  findPhoneById(id: number): Promise<Phone | null>;

  // Brand
  findBrandsByIds(ids: number[]): Promise<Brand[]>;
  findAllBrands(): Promise<Brand[]>;

  // Category
  findCategoriesByIds(ids: number[]): Promise<Category[]>;
  findAllCategories(): Promise<Category[]>;
  findAllChildCategoryIds(parentId: number): Promise<number[]>;
  findAllParentCategoryIds(categoryId: number): Promise<number[]>;

  // Phone Variant
  listPhoneVariants(
    filter: PhoneFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<PhoneVariant>>;
  findVariantsById(id: number): Promise<PhoneVariant | null>;
  findVariantsByIds(ids: number[]): Promise<PhoneVariant[]>;
  findVariantsByPhoneId(phoneId: number): Promise<PhoneVariant[]>;
  findVariantsByPhoneIds(phoneIds: number[]): Promise<PhoneVariant[]>;

  // Review
  findReviewsByVariantIds(variantIds: number[]): Promise<Review[]>;
  findReviewsByCustomerIdAndVariantId(customerId: number, variantId: number): Promise<Review[]>;

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
  findVariantImagesByIds(ids: number[]): Promise<VariantImage[]>;

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
  deleteImage(id: number): Promise<void>;
  deleteImagesByIds(ids: number[]): Promise<void>;
  softDeleteImagesByIds(ids: number[]): Promise<void>;

  // Brand
  insertBrand(brand: Brand): Promise<Brand>;
  updateBrand(id: number, data: BrandUpdateDto): Promise<void>;
  softDeleteBrand(id: number): Promise<void>;

  // Category
  insertCategory(category: Category): Promise<Category>;
  updateCategory(id: number, data: CategoryUpdateDto): Promise<void>;
  softDeleteCategoriesByIds(ids: number[]): Promise<void>;

  // Phone
  insertPhone(phone: Phone): Promise<Phone>;
  updatePhone(id: number, data: PhoneUpdateDto): Promise<void>;
  softDeletePhonesByIds(ids: number[]): Promise<void>;

  // Color
  insertColor(color: Color): Promise<Color>;

  // Phone Variant
  insertPhoneVariant(variant: PhoneVariant): Promise<PhoneVariant>;
  updatePhoneVariant(id: number, data: PhoneVariantUpdatePrisma): Promise<void>;
  softDeletePhoneVariantsByIds(ids: number[]): Promise<void>;

  // Variant Color
  insertVariantColors(variantColors: VariantColor[]): Promise<void>;
  updateVariantColorByVariantIdAndColorId(
    variantId: number,
    colorId: number,
    data: VariantColorUpdatePrisma,
  ): Promise<void>;
  deleteVariantColorByVariantIdAndColorId(
    variantId: number,
    colorId: number,
  ): Promise<void>;
  softDeleteVariantColorsByVariantIds(variantIds: number[]): Promise<void>;

  // Variant Price
  insertVariantPrice(variantPrice: VariantPrice): Promise<VariantPrice>;
  updateVariantPrice(id: number, data: VariantPriceUpdateDto): Promise<void>;
  softDeleteVariantPricesByVariantIds(variantIds: number[]): Promise<void>;

  // Variant Discount
  insertVariantDiscount(
    variantDiscount: VariantDiscount,
  ): Promise<VariantDiscount>;
  updateVariantDiscount(
    id: number,
    data: VariantDiscountUpdateDto,
  ): Promise<void>;
  softDeleteVariantDiscountsByVariantIds(variantIds: number[]): Promise<void>;

  // Variant Image
  insertVariantImages(variantImages: VariantImage[]): Promise<void>;
  updateVariantImage(id: number, imageId: number): Promise<void>;
  deleteVariantImage(id: number): Promise<void>;
  softDeleteVariantImagesByVariantIds(variantIds: number[]): Promise<void>;

  // Specification
  insertSpecification(specification: Specification): Promise<Specification>;

  // Variant Specification
  insertVariantSpecifications(
    variantSpecifications: VariantSpecification[],
  ): Promise<void>;
  updateVariantSpecificationByVariantIdAndSpecId(
    variantId: number,
    specId: number,
    data: VariantSpecificationUpdatePrisma,
  ): Promise<void>;
  deleteVariantSpecificationByVariantIdAndSpecId(
    variantId: number,
    specId: number,
  ): Promise<void>;
  softDeleteVariantSpecificationsByVariantIds(
    variantIds: number[],
  ): Promise<void>;

  // Inventory
  updateInventory(id: number, data: InventoryUpdateDto): Promise<void>;

  // Review
  insertReview(review: Review): Promise<Review>;
  softDeleteReviewsByVariantIds(variantIds: number[]): Promise<void>;
}
