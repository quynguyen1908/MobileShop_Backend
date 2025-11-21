import { ShippingQuoteInput, shippingQuoteSchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import {
  GHNShippingResponse,
  type LocationData,
} from '@app/contracts/interface';
import { catchError, firstValueFrom } from 'rxjs';
import { formatCurrency } from '@app/contracts/utils';
import { normalizeText } from '@app/contracts/utils';

interface LocationResult {
  wardCode: string;
  districtId: number;
  found: boolean;
}

@Injectable()
export class ShipmentToolService {
  private readonly csvFilePath: string;
  private readonly ghnApiUrl: string;
  private readonly ghnToken: string;
  private readonly ghnShopId: number;
  private readonly logger = new Logger(ShipmentToolService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.csvFilePath = path.join(process.cwd(), 'data/datasets', 'convert.csv');
    this.ghnApiUrl = this.configService.get<string>(
      'GHN_API_URL',
      'https://online-gateway.ghn.vn/shiip/public-api/v2',
    );
    this.ghnToken = this.configService.get<string>('GHN_API_KEY', '');
    this.ghnShopId = Number(this.configService.get<string>('GHN_SHOP_ID', '0'));
  }

  async findLocationIds(
    commune: string,
    province: string,
  ): Promise<LocationResult> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.csvFilePath)) {
        this.logger.error(`Location CSV file not found at: ${this.csvFilePath}`);
        resolve({ wardCode: '0', districtId: 0, found: false });
        return;
      }

      const matchingRecords: LocationData[] = [];

      fs.createReadStream(this.csvFilePath)
        .pipe(csv())
        .on('data', (row: LocationData) => {
          const normalizedInputCommune = normalizeText(commune);
          const normalizedInputProvince = normalizeText(province);

          const normalizedWardName = normalizeText(row.WardName || '');
          const normalizedWardNameNew = normalizeText(row.WardName_New || '');
          const normalizedProvinceName = normalizeText(row.ProvinceName || '');
          const normalizedProvinceNameNew = normalizeText(
            row.ProvinceName_New || '',
          );

          const communeMatches =
            normalizedWardName.includes(normalizedInputCommune) ||
            normalizedWardNameNew.includes(normalizedInputCommune) ||
            normalizedInputCommune.includes(normalizedWardName) ||
            normalizedInputCommune.includes(normalizedWardNameNew);

          const provinceMatches =
            normalizedProvinceName.includes(normalizedInputProvince) ||
            normalizedProvinceNameNew.includes(normalizedInputProvince) ||
            normalizedInputProvince.includes(normalizedProvinceName) ||
            normalizedInputProvince.includes(normalizedProvinceNameNew);

          if (communeMatches && provinceMatches) {
            matchingRecords.push(row);
          }
        })
        .on('end', () => {
          if (matchingRecords.length > 0) {
            const record = matchingRecords[0];

            resolve({
              wardCode: record.WardID,
              districtId: parseInt(record.DistrictID),
              found: true,
            });
          } else {
            this.logger.log(
              `No matching location found for commune "${commune}" in province "${province}"`,
            );
            resolve({ wardCode: '0', districtId: 0, found: false });
          }
        })
        .on('error', (error: unknown) => {
          this.logger.error('Error reading CSV file:', error);
          reject(new Error(`Error reading CSV file: ${String(error)}`));
        });
    });
  }

  async getShippingQuote(commune: string, province: string): Promise<string> {
    try {
      const locationResult = await this.findLocationIds(commune, province);

      if (!locationResult.found) {
        return `Không tìm thấy thông tin địa chỉ cho xã/phường "${commune}" tại tỉnh/thành phố "${province}". Vui lòng kiểm tra lại thông tin địa chỉ.`;
      }

      const { data: responseData } = await firstValueFrom(
        this.httpService
          .post<GHNShippingResponse>(
            `${this.ghnApiUrl}/shipping-order/fee`,
            {
              to_district_id: locationResult.districtId,
              to_ward_code: locationResult.wardCode,
              weight: 400,
              service_type_id: 2,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Token: this.ghnToken,
                ShopId: this.ghnShopId,
              },
            },
          )
          .pipe(
            catchError((error: unknown) => {
              interface AxiosErrorResponse {
                response?: {
                  data?: {
                    message?: string;
                  };
                };
                message?: string;
              }

              const axiosError = error as AxiosErrorResponse;

              this.logger.error(
                'GHN API Error:',
                axiosError?.response?.data ||
                  axiosError?.message ||
                  'Unknown error',
              );

              const errorMessage =
                axiosError?.response?.data?.message ||
                axiosError?.message ||
                'Lỗi không xác định';

              throw new Error(`Không thể tính phí vận chuyển: ${errorMessage}`);
            }),
          ),
      );

      if (responseData.code === 200 && responseData.data) {
        const shippingData = responseData.data;

        let response = `🚚 **Báo giá vận chuyển đến ${commune}, ${province}**\n\n`;
        response += `💰 Phí vận chuyển: ${formatCurrency(shippingData.total)}\n`;

        const serviceFee = shippingData.service_fee;
        if (serviceFee > 0 && serviceFee !== shippingData.total) {
          response += `📦 Phí dịch vụ cơ bản: ${formatCurrency(serviceFee)}\n`;
        }

        const insuranceFee = shippingData.insurance_fee;
        if (insuranceFee > 0) {
          response += `🔒 Phí bảo hiểm: ${formatCurrency(insuranceFee)}\n`;
        }

        const remoteAreaFee = shippingData.deliver_remote_areas_fee;
        if (remoteAreaFee > 0) {
          response += `🏞️ Phụ phí vùng xa: ${formatCurrency(remoteAreaFee)}\n`;
        }

        response += `⏱️ Thời gian giao hàng ước tính: 2-3 ngày làm việc\n\n`;

        response += `ℹ️ Vận chuyển bởi đối tác Giao Hàng Nhanh (GHN)`;

        return response;
      } else {
        return `Không thể tính phí vận chuyển. Vui lòng thử lại sau hoặc liên hệ với bộ phận hỗ trợ.`;
      }
    } catch (error: unknown) {
      this.logger.error('Error fetching shipping quote:', error);
      return 'Đã xảy ra lỗi khi lấy báo giá vận chuyển. Vui lòng thử lại sau.';
    }
  }

  createShippingQuoteTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: ShippingQuoteInput): Promise<string> =>
        this.getShippingQuote(input.commune, input.province),
      {
        name: 'getShippingQuote',
        description: `Công cụ tính phí vận chuyển trong hệ thống PHONEHUB.
        
        Sử dụng công cụ này khi khách hàng hỏi về phí vận chuyển đến một địa chỉ cụ thể
        
        Ví dụ câu hỏi từ khách hàng:
        - "Phí ship đến phường Sài Gòn, TP Hồ Chí Minh bao nhiêu?"
        - "Giao hàng đến xã Long Thành, tỉnh Đồng Nai tốn bao nhiêu?"
        - "Tính phí vận chuyển về phường Đống Đa, Hà Nội"
        - "Ship đến phường Tân Lộc, Cần Thơ giá bao nhiêu?"
        - "Chi phí giao hàng đến xã Chợ Mới, An Giang?"
        
        YÊU CẦU ĐỊA CHỈ 2 CẤP:
        - Cấp 1: Tỉnh/Thành phố (VD: TP Hồ Chí Minh, Hà Nội, Cần Thơ)
        - Cấp 2: Xã/Phường (VD: Phường Sài Gòn, Xã Long Thành)

        Lưu ý:
        - Tool sẽ hiển thị phí vận chuyển chính xác theo địa chỉ 2 cấp
        - Luôn hiển thị đầy đủ: Phí ship, thời gian giao hàng dự kiến
        - Không được hiển thị thông tin kỹ thuật nội bộ như mã vùng, ID hệ thống, v.v.
        - BẮT BUỘC phải có đủ 2 cấp địa chỉ: nếu thiếu thông tin, hãy hỏi người dùng bổ sung
        - Định dạng yêu cầu: [Xã/Phường] + [Tỉnh/Thành phố]
        - Nếu không tìm thấy địa chỉ trong hệ thống, thông báo không hỗ trợ giao hàng đến khu vực đó`,
        schema: shippingQuoteSchema,
      },
    );
  }
}
