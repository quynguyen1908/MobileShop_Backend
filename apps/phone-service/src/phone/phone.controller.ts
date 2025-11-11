import { Controller } from '@nestjs/common';
import { PhoneService } from './phone.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type {
  BrandCreateDto,
  CategoryCreateDto,
  CategoryUpdateDto,
  PhoneCreateDto,
  PhoneFilterDto,
  PhoneUpdateDto,
  PhoneVariantCreateDto,
  PhoneVariantUpdateDto,
  ReviewCreateDto,
} from '@app/contracts/phone';
import { PHONE_PATTERN } from '@app/contracts/phone/phone.pattern';
import type { PagingDto, Requester } from '@app/contracts';

@Controller()
export class PhoneController {
  constructor(private readonly phoneService: PhoneService) {}

  @MessagePattern(PHONE_PATTERN.GET_PHONES_BY_IDS)
  async getPhonesByIds(@Payload() phoneIds: number[]) {
    return this.phoneService.getPhonesByIds(phoneIds);
  }

  @MessagePattern(PHONE_PATTERN.LIST_PHONES)
  async listPhones(@Payload() paging: PagingDto) {
    return this.phoneService.listPhones(paging);
  }

  @MessagePattern(PHONE_PATTERN.GET_PHONE_BY_ID)
  async getPhoneById(@Payload() id: number) {
    return this.phoneService.getPhoneById(id);
  }

  @MessagePattern(PHONE_PATTERN.CREATE_PHONE)
  async createPhone(@Payload() phoneCreateDto: PhoneCreateDto) {
    return this.phoneService.createPhone(phoneCreateDto);
  }

  @MessagePattern(PHONE_PATTERN.UPDATE_PHONE)
  async updatePhone(@Payload() payload: { id: number; data: PhoneUpdateDto }) {
    const { id, data } = payload;
    await this.phoneService.updatePhone(id, data);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.DELETE_PHONE)
  async deletePhonesByIds(@Payload() id: number) {
    await this.phoneService.deletePhonesByIds([id]);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.GET_ALL_CATEGORIES)
  async getAllCategories() {
    return this.phoneService.getAllCategories();
  }

  @MessagePattern(PHONE_PATTERN.GET_CATEGORIES_BY_IDS)
  async getCategoriesByIds(@Payload() ids: number[]) {
    return this.phoneService.getCategoriesByIds(ids);
  }

  @MessagePattern(PHONE_PATTERN.GET_PARENT_CATEGORY_IDS_BY_VARIANT_IDS)
  async getParentCategoryIds(@Payload() variantIds: number[]) {
    return this.phoneService.getParentCategoryIdsByVariantIds(variantIds);
  }

  @MessagePattern(PHONE_PATTERN.CREATE_CATEGORY)
  async createCategory(@Payload() categoryCreateDto: CategoryCreateDto) {
    return this.phoneService.createCategory(categoryCreateDto);
  }

  @MessagePattern(PHONE_PATTERN.UPDATE_CATEGORY)
  async updateCategory(
    @Payload() payload: { id: number; data: CategoryUpdateDto },
  ) {
    const { id, data } = payload;
    await this.phoneService.updateCategory(id, data);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.DELETE_CATEGORY)
  async deleteCategory(@Payload() id: number) {
    await this.phoneService.deleteCategory(id);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.GET_ALL_BRANDS)
  async getAllBrands() {
    return this.phoneService.getAllBrands();
  }

  @MessagePattern(PHONE_PATTERN.CREATE_BRAND)
  async createBrand(@Payload() brandCreateDto: BrandCreateDto) {
    return this.phoneService.createBrand(brandCreateDto);
  }

  @MessagePattern(PHONE_PATTERN.UPDATE_BRAND)
  async updateBrand(
    @Payload() payload: { id: number; name?: string; imageUrl?: string },
  ) {
    const { id, name, imageUrl } = payload;
    await this.phoneService.updateBrand(id, name, imageUrl);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.DELETE_BRAND)
  async deleteBrand(@Payload() id: number) {
    await this.phoneService.deleteBrand(id);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.GET_ALL_COLORS)
  async getAllColors() {
    return this.phoneService.getAllColors();
  }

  @MessagePattern(PHONE_PATTERN.CREATE_COLOR)
  async createColor(@Payload() name: string) {
    return this.phoneService.createColor(name);
  }

  @MessagePattern(PHONE_PATTERN.GET_VARIANT_BY_ID)
  async getVariantById(@Payload() variantId: number) {
    return this.phoneService.getVariantById(variantId);
  }

  @MessagePattern(PHONE_PATTERN.GET_VARIANTS_BY_IDS)
  async getVariantsByIds(@Payload() variantIds: number[]) {
    return this.phoneService.getVariantsByIds(variantIds);
  }

  @MessagePattern(PHONE_PATTERN.GET_RELATED_VARIANTS)
  async getRelatedVariants(@Payload() variantId: number) {
    return this.phoneService.getRelatedVariants(variantId);
  }

  @MessagePattern(PHONE_PATTERN.LIST_PHONE_VARIANTS)
  async listPhoneVariants(
    @Payload() payload: { filter: PhoneFilterDto; paging: PagingDto },
  ) {
    const { filter, paging } = payload;
    return this.phoneService.listPhoneVariants(filter, paging);
  }

  @MessagePattern(PHONE_PATTERN.CREATE_PHONE_VARIANT)
  async createPhoneVariant(
    @Payload()
    payload: {
      phoneId: number;
      phoneVariantCreateDto: PhoneVariantCreateDto;
    },
  ) {
    const { phoneId, phoneVariantCreateDto } = payload;
    return this.phoneService.createPhoneVariant(phoneId, phoneVariantCreateDto);
  }

  @MessagePattern(PHONE_PATTERN.UPDATE_PHONE_VARIANT)
  async updatePhoneVariant(
    @Payload()
    payload: {
      id: number;
      data: PhoneVariantUpdateDto;
    },
  ) {
    const { id, data } = payload;
    await this.phoneService.updatePhoneVariant(id, data);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.DELETE_PHONE_VARIANT)
  async deletePhoneVariantsByIds(@Payload() id: number) {
    await this.phoneService.deletePhoneVariantsByIds([id]);
    return { success: true };
  }

  @MessagePattern(PHONE_PATTERN.GET_IMAGES_BY_IDS)
  async getImagesByIds(@Payload() imageIds: number[]) {
    return this.phoneService.getImagesByIds(imageIds);
  }

  @MessagePattern(PHONE_PATTERN.GET_ALL_SPECIFICATIONS)
  async getAllSpecifications() {
    return this.phoneService.getAllSpecifications();
  }

  @MessagePattern(PHONE_PATTERN.CREATE_SPECIFICATION)
  async createSpecification(@Payload() name: string) {
    return this.phoneService.createSpecification(name);
  }

  @MessagePattern(PHONE_PATTERN.GET_INVENTORY_BY_SKU)
  async getInventoryBySku(@Payload() sku: string) {
    return this.phoneService.getInventoryBySku(sku);
  }

  @MessagePattern(PHONE_PATTERN.CHECK_INVENTORY_AVAILABILITY)
  async checkInventoryAvailability(
    @Payload()
    payload: {
      variantId: number;
      colorId: number;
      requiredQuantity: number;
    },
  ) {
    const { variantId, colorId, requiredQuantity } = payload;
    return this.phoneService.checkInventoryAvailability(
      variantId,
      colorId,
      requiredQuantity,
    );
  }

  @MessagePattern(PHONE_PATTERN.CREATE_REVIEW)
  async createReview(
    @Payload() payload: {
      requester: Requester;
      reviewCreateDto: ReviewCreateDto;
    }
  ) {
    const { requester, reviewCreateDto } = payload;
    return this.phoneService.createReview(requester, reviewCreateDto);
  }
}