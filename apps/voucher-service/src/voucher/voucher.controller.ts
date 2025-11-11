import { Controller } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { VOUCHER_PATTERN } from '@app/contracts/voucher';
import type { VoucherCreateDto, VoucherUpdateRequest } from '@app/contracts/voucher';
import type { PagingDto } from '@app/contracts';

@Controller()
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @MessagePattern(VOUCHER_PATTERN.LIST_VOUCHERS)
  async listVouchers(@Payload() paging: PagingDto) {
    return this.voucherService.listVouchers(paging);
  }

  @MessagePattern(VOUCHER_PATTERN.GET_VOUCHERS_BY_VARIANT_IDS)
  async getVouchersByVariantIds(@Payload() variantIds: number[]) {
    return this.voucherService.getVouchersByVariantIds(variantIds);
  }

  @MessagePattern(VOUCHER_PATTERN.GET_VOUCHERS_BY_IDS)
  async getVouchersByIds(@Payload() voucherIds: number[]) {
    return this.voucherService.getVouchersByIds(voucherIds);
  }

  @MessagePattern(VOUCHER_PATTERN.CREATE_VOUCHER)
  async createVoucher(@Payload() voucherCreateDto: VoucherCreateDto) {
    return this.voucherService.createVoucher(voucherCreateDto);
  }

  @MessagePattern(VOUCHER_PATTERN.UPDATE_VOUCHER)
  async updateVoucher(
    @Payload() data: { id: number; voucherUpdateDto: VoucherUpdateRequest },
  ) {
    await this.voucherService.updateVoucher(
      data.id,
      data.voucherUpdateDto,
    );
    return { success: true };
  }
}
