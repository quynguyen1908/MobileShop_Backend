import { Controller } from '@nestjs/common';
import { PhoneService } from './phone.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type {
  BrandCreateDto,
  CategoryCreateDto,
  PhoneCreateDto,
  PhoneFilterDto,
  PhoneVariantCreateDto,
} from '@app/contracts/phone';
import { PHONE_PATTERN } from '@app/contracts/phone/phone.pattern';
import { PagingDto } from '@app/contracts';

@Controller()
export class PhoneController {
  constructor(private readonly phoneService: PhoneService) {}

  @MessagePattern(PHONE_PATTERN.GET_PHONES_BY_IDS)
  async getPhonesByIds(@Payload() phoneIds: number[]) {
    return this.phoneService.getPhonesByIds(phoneIds);
  }

  @MessagePattern(PHONE_PATTERN.CREATE_PHONE)
  async createPhone(@Payload() phoneCreateDto: PhoneCreateDto) {
    return this.phoneService.createPhone(phoneCreateDto);
  }

  @MessagePattern(PHONE_PATTERN.GET_ALL_CATEGORIES)
  async getAllCategories() {
    return this.phoneService.getAllCategories();
  }

  @MessagePattern(PHONE_PATTERN.CREATE_CATEGORY)
  async createCategory(@Payload() categoryCreateDto: CategoryCreateDto) {
    return this.phoneService.createCategory(categoryCreateDto);
  }

  @MessagePattern(PHONE_PATTERN.GET_ALL_BRANDS)
  async getAllBrands() {
    return this.phoneService.getAllBrands();
  }

  @MessagePattern(PHONE_PATTERN.CREATE_BRAND)
  async createBrand(@Payload() brandCreateDto: BrandCreateDto) {
    return this.phoneService.createBrand(brandCreateDto);
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
}
