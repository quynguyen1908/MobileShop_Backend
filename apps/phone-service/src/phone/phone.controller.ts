import { Controller } from '@nestjs/common';
import { PhoneService } from './phone.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PHONE_PATTERN, PhoneFilterDto } from '@app/contracts/phone';
import { PagingDto } from '@app/contracts';

@Controller()
export class PhoneController {
  constructor(private readonly phoneService: PhoneService) {}

  @MessagePattern(PHONE_PATTERN.GET_PHONES_BY_IDS)
  async getPhonesByIds(@Payload() phoneIds: number[]) {
    return this.phoneService.getPhonesByIds(phoneIds);
  }

  @MessagePattern(PHONE_PATTERN.GET_ALL_CATEGORIES)
  async getAllCategories() {
    return this.phoneService.getAllCategories();
  }

  @MessagePattern(PHONE_PATTERN.GET_VARIANTS_BY_IDS)
  async getVariantsByIds(@Payload() variantIds: number[]) {
    return this.phoneService.getVariantsByIds(variantIds);
  }

  @MessagePattern(PHONE_PATTERN.GET_IMAGES_BY_IDS)
  async getImagesByIds(@Payload() imageIds: number[]) {
    return this.phoneService.getImagesByIds(imageIds);
  }

  @MessagePattern(PHONE_PATTERN.LIST_PHONE_VARIANTS)
  async listPhoneVariants(
    @Payload() payload: { filter: PhoneFilterDto; paging: PagingDto },
  ) {
    const { filter, paging } = payload;
    return this.phoneService.listPhoneVariants(filter, paging);
  }

  @MessagePattern(PHONE_PATTERN.GET_INVENTORY_BY_SKU)
  async getInventoryBySku(@Payload() sku: string) {
    return this.phoneService.getInventoryBySku(sku);
  }
}
