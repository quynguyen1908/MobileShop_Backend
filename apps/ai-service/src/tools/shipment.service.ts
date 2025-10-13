import { ShippingQuoteInput, shippingQuoteSchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
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
  wardId: number;
  districtId: number;
  found: boolean;
}

@Injectable()
export class ShipmentToolService {
  private readonly csvFilePath: string;
  private readonly ghnApiUrl: string;
  private readonly ghnToken: string;
  private readonly ghnShopId: number;

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
        console.error(`Location CSV file not found at: ${this.csvFilePath}`);
        resolve({ wardId: 0, districtId: 0, found: false });
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
              wardId: parseInt(record.WardID),
              districtId: parseInt(record.DistrictID),
              found: true,
            });
          } else {
            console.log(
              `No matching location found for commune "${commune}" in province "${province}"`,
            );
            resolve({ wardId: 0, districtId: 0, found: false });
          }
        })
        .on('error', (error: unknown) => {
          console.error('Error reading CSV file:', error);
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
              to_ward_code: String(locationResult.wardId),
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

              console.error(
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
      console.error('Error fetching shipping quote:', error);
      return 'Đã xảy ra lỗi khi lấy báo giá vận chuyển. Vui lòng thử lại sau.';
    }
  }

  createShippingQuoteTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: ShippingQuoteInput): Promise<string> =>
        this.getShippingQuote(input.commune, input.province),
      {
        name: 'getShippingQuote',
        description: `Gọi API để nhận báo giá vận chuyển dựa trên tỉnh/thành phố và xã/phường được cung cấp.
        Bất cứ câu hỏi nào liên quan đến việc báo giá vận chuyển, bạn nên sử dụng công cụ này.
        Ví dụ: "Báo giá vận chuyển đến xã XYZ, tỉnh TP".
        Nếu bạn không chắc chắn về xã/phường hoặc tỉnh/thành phố, hãy hỏi người dùng để lấy thông tin chính xác trước khi gọi công cụ này.
        Nếu bạn không biết câu trả lời, hãy trả lời rằng bạn không biết thay vì đoán.`,
        schema: shippingQuoteSchema,
      },
    );
  }
}
