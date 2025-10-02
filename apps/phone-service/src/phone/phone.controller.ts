import { Controller } from '@nestjs/common';
import { PhoneService } from './phone.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PHONE_PATTERN } from '@app/contracts/phone';

@Controller()
export class PhoneController {
  constructor(private readonly phoneService: PhoneService) {}

  @MessagePattern(PHONE_PATTERN.GET_PHONE)
  async getPhone(@Payload() phoneId: number) {
    return this.phoneService.getPhone(phoneId);
  }
}
