import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AddressCreateDto,
  AddressUpdateDto,
  CustomerUpdateDto,
  CustomerUpdateProfileDto,
  USER_PATTERN,
} from '@app/contracts/user';
import type { Requester } from '@app/contracts';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern(USER_PATTERN.GET_CUSTOMER_BY_USER_ID)
  async getCustomerByUserId(@Payload() request: Requester) {
    return this.userService.getCustomerByUserId(request);
  }

  @MessagePattern(USER_PATTERN.GET_CUSTOMER_BY_ID)
  async getCustomerById(@Payload() id: number) {
    return this.userService.getCustomerById(id);
  }

  @MessagePattern(USER_PATTERN.UPDATE_CUSTOMER)
  async updateCustomer(
    @Payload() payload: { id: number; data: CustomerUpdateDto },
  ) {
    const { id, data } = payload;
    return this.userService.updateCustomer(id, data);
  }

  @MessagePattern(USER_PATTERN.UPDATE_CUSTOMER_PROFILE)
  async updateCustomerProfile(
    @Payload()
    payload: {
      requester: Requester;
      data: CustomerUpdateProfileDto;
    },
  ) {
    const { requester, data } = payload;
    await this.userService.updateCustomerProfile(requester, data);
    return { success: true };
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

  @MessagePattern(USER_PATTERN.GET_CUSTOMER_ADDRESSES)
  async getCustomerAddresses(@Payload() request: Requester) {
    return this.userService.getAddressBooks(request);
  }

  @MessagePattern(USER_PATTERN.ADD_CUSTOMER_ADDRESS)
  async addCustomerAddress(
    @Payload() payload: { requester: Requester; data: AddressCreateDto },
  ) {
    const { requester, data } = payload;
    return this.userService.addAddressBook(requester, data);
  }

  @MessagePattern(USER_PATTERN.UPDATE_CUSTOMER_ADDRESS)
  async updateCustomerAddress(
    @Payload()
    payload: {
      requester: Requester;
      addressId: number;
      data: AddressUpdateDto;
    },
  ) {
    const { requester, addressId, data } = payload;
    await this.userService.updateAddressBook(requester, addressId, data);
    return { success: true };
  }

  @MessagePattern(USER_PATTERN.DELETE_CUSTOMER_ADDRESS)
  async deleteCustomerAddress(
    @Payload() payload: { requester: Requester; addressId: number },
  ) {
    const { requester, addressId } = payload;
    await this.userService.deleteAddressBook(requester, addressId);
    return { success: true };
  }

  @MessagePattern(USER_PATTERN.GET_NOTIFICATIONS)
  async getNotifications(@Payload() request: Requester) {
    return this.userService.getNotifications(request);
  }

  @MessagePattern(USER_PATTERN.READ_NOTIFICATIONS)
  async readNotifications(
    @Payload() payload: { requester: Requester; notificationIds: number[] },
  ) {
    const { requester, notificationIds } = payload;
    await this.userService.readNotifications(requester, notificationIds);
    return { success: true };
  }
}
