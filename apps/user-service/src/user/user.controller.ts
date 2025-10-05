import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_PATTERN } from '@app/contracts/user';
import type { Requester } from '@app/contracts';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern(USER_PATTERN.GET_CUSTOMER_BY_USER_ID)
  async getCustomerByUserId(@Payload() request: Requester) {
    return this.userService.getCustomerByUserId(request);
  }

  @MessagePattern(USER_PATTERN.GET_ALL_PROVINCES)
  async getAllProvinces() {
    return this.userService.getAllProvinces();
  }

  @MessagePattern(USER_PATTERN.GET_PROVINCES_BY_IDS)
  async getProvincesByIds(@Payload() ids: number[]) {
    return this.userService.getProvincesByIds(ids);
  }

  @MessagePattern(USER_PATTERN.GET_COMMUNES_BY_PROVINCE_CODE)
  async getCommunesByProvinceCode(@Payload() provinceCode: number) {
    return this.userService.getCommunesByProvinceCode(provinceCode);
  }

  @MessagePattern(USER_PATTERN.GET_COMMUNES_BY_IDS)
  async getCommunesByIds(@Payload() ids: number[]) {
    return this.userService.getCommunesByIds(ids);
  }
}
