import { Injectable, Logger } from '@nestjs/common';
import type { IExtractService } from '../etl.port';
import { SourceType } from '@app/contracts/ai';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { PhoneVariantDto } from '@app/contracts/phone';
import { AppError, Paginated } from '@app/contracts';
import { extractErrorMessage, formatCurrency } from '@app/contracts/utils';
import * as fs from 'fs';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiResponseDto } from '@app/contracts/ai/ai.dto';

@Injectable()
export class ExtractService implements IExtractService {
  private readonly logger = new Logger(ExtractService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async readFromSource(type: SourceType): Promise<string[]> {
    switch (type) {
      case SourceType.FILE:
        return this.readFromFile();
      case SourceType.DATABASE:
        return this.readFromDatabase();
      default:
        return Promise.reject(new Error('Unsupported source type'));
    }
  }

  private async readFromDatabase(): Promise<string[]> {
    try {
      // TODO: Add voucher data extraction logic
      // const voucherServiceUrl = this.configService.get<string>('VOUCHER_SERVICE_URL', 'http://localhost:3000/api/v1/vouchers');

      const phoneServiceUrl = this.configService.get<string>(
        'PHONE_SERVICE_URL',
        'http://localhost:3000/api/v1/phones',
      );
      const allPhoneVariants: PhoneVariantDto[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 100;

      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get<ApiResponseDto<Paginated<PhoneVariantDto>>>(
            `${phoneServiceUrl}/variants/filter`,
            {
              params: { page, limit },
            },
          ),
        );

        const apiResponse = response.data;

        if (
          !apiResponse ||
          typeof apiResponse !== 'object' ||
          !apiResponse.data
        ) {
          hasMore = false;
          break;
        }

        const paginated = apiResponse.data;

        if (!paginated || !Array.isArray(paginated.data)) {
          hasMore = false;
          break;
        }

        const phoneVariantList: PhoneVariantDto[] = paginated.data;

        allPhoneVariants.push(...phoneVariantList);

        const totalFetched = paginated?.total ?? 0;
        const currentlyFetched = page * limit;
        if (currentlyFetched >= totalFetched) hasMore = false;
        page++;
      }

      const documents: string[] = [];
      const processedPhones = new Map<number, boolean>();

      for (const variant of allPhoneVariants) {
        if (
          typeof variant.phone.id === 'number' &&
          !processedPhones.has(variant.phone.id)
        ) {
          processedPhones.set(variant.phone.id, true);
        }

        const specs = variant.specifications
          .map((spec) => `- ${spec.specification.name}: ${spec.info}`)
          .join('\n');

        const price = variant.price.price;
        const discount = variant.discount?.discountPercent || 0;
        const finalPrice = price - (price * discount) / 100;

        const colors = variant.colors.map((c) => c.color.name).join(', ');

        documents.push(
          JSON.stringify({
            id: `variant-${variant.id}`,
            content: `# ${variant.phone.name} - ${variant.variantName}
                      ID sản phẩm: ${variant.id}
                      Thương hiệu: ${variant.phone.brand.name}
                      Dòng sản phẩm: ${variant.phone.category.name}
                      Màu sắc: ${colors}
                      Giá cuối: ${formatCurrency(finalPrice)}
                      
                      ## Mô tả:
                      ${variant.description ? variant.description : 'N/A'}

                      ## Tính năng nổi bật:
                      ${variant.features ? variant.features : 'N/A'}

                      ## Thông số kỹ thuật:
                      ${specs}`,
            metadata: {
              id: `variant-${variant.id}`,
              source: 'database',
              title: `${variant.phone.name} - ${variant.variantName}`,
              tags: [
                'phone',
                'variant',
                variant.phone.brand.name,
                ...variant.colors.map((c) => c.color.name),
              ],
              createdAt: new Date(),
              phoneId: variant.phone.id,
              variantId: variant.id,
              brand: variant.phone.brand.name,
              category: variant.phone.category.name,
              color: colors,
              price: finalPrice,
              type: 'phone-variant',
            },
          }),
        );
      }

      return documents;
    } catch (error: unknown) {
      this.logger.error('Failed to fetch phone data:', error);
      const errorMessage = extractErrorMessage(error);
      throw AppError.from(new Error(errorMessage), 400).withLog(
        `Failed to fetch phone data: ${errorMessage}`,
      );
    }
  }

  private async readFromFile(): Promise<string[]> {
    try {
      const dataDir = this.configService.get<string>(
        'FILE_DATA_DIRECTORY',
        path.join(process.cwd(), 'data/files'),
      );

      if (!fs.existsSync(dataDir)) {
        this.logger.warn(`Directory not found: ${dataDir}, creating it...`);
        fs.mkdirSync(dataDir, { recursive: true });
        return [];
      }

      const files = await fs.promises.readdir(dataDir);

      const supportedExtensions = ['.txt', '.md'];
      const validFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      });

      if (validFiles.length === 0) {
        this.logger.warn(`No supported files found in directory: ${dataDir}`);
        return [];
      }

      const documents: string[] = [];

      for (const file of validFiles) {
        const filePath = path.join(dataDir, file);
        const fileExtension = path.extname(file).toLowerCase();
        const fileName = path.basename(file, fileExtension);

        const content = await fs.promises.readFile(filePath, 'utf-8');

        documents.push(
          JSON.stringify({
            id: `file-${fileName}`,
            content: content,
            metadata: {
              id: `file-${fileName}`,
              source: 'file',
              title: fileName,
              tags: ['file', fileExtension.replace('.', '')],
              createdAt: new Date((await fs.promises.stat(filePath)).mtime),
              fileType: fileExtension,
              type: 'file',
            },
          }),
        );
      }

      return documents;
    } catch (error: unknown) {
      this.logger.error('Failed to read from file:', error);
      const errorMessage = extractErrorMessage(error);
      throw AppError.from(new Error(errorMessage), 400).withLog(
        `Failed to read from file: ${errorMessage}`,
      );
    }
  }
}
