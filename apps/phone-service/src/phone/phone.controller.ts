import { Controller } from '@nestjs/common';
import { PhoneService } from './phone.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PHONE_PATTERN, PhoneFilterDto } from '@app/contracts/phone';
import { PagingDto } from '@app/contracts';

@Controller()
export class PhoneController {
  constructor(private readonly phoneService: PhoneService) {}

  @MessagePattern(PHONE_PATTERN.GET_PHONE)
  async getPhone(@Payload() phoneId: number) {
    return this.phoneService.getPhone(phoneId);
  }

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

  @MessagePattern(PHONE_PATTERN.LIST_PHONES)
  async listPhones(
    @Payload() payload: { filter: PhoneFilterDto; paging: PagingDto },
  ) {
    const { filter, paging } = payload;
    return this.phoneService.listPhones(filter, paging);
  }
}
