import { Injectable } from '@nestjs/common';
import type { IExtractService } from '../etl.port';
import { SourceType } from '@app/contracts/ai';
import { ConfigService } from '@nestjs/config/dist/config.service';
import axios from 'axios';
import { PhoneDto } from '@app/contracts/phone';
import { AppError, Paginated } from '@app/contracts';
import { formatCurrency } from '@app/contracts/utils';
import * as fs from 'fs';
import * as path from 'path';

interface DocumentContent {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class ExtractService implements IExtractService {
  constructor(private configService: ConfigService) {}

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
      const allPhones: PhoneDto[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 100;

      while (hasMore) {
        const response = await axios.get<{
          data: Paginated<PhoneDto>;
        }>(`${phoneServiceUrl}/filter`, {
          params: {
            page: page,
            limit: limit,
          },
        });

        if (
          !response.data?.data?.data ||
          response.data.data.data.length === 0
        ) {
          hasMore = false;
          break;
        }

        const phoneData = response.data.data.data;
        allPhones.push(...phoneData);

        const totalFetched = response.data.data.total || 0;
        const currentlyFetched = page * limit;
        if (currentlyFetched >= totalFetched) hasMore = false;
        page++;
      }

      const documents: string[] = [];

      for (const phone of allPhones) {
        documents.push(
          JSON.stringify({
            id: `phone-${phone.id}`,
            content: `# ${phone.name}
                        ${phone.description ? phone.description : ''}

                        ## Thông tin chung
                        - Thương hiệu: ${phone.brand.name}
                        - Dòng sản phẩm: ${phone.category.name}`,
            metadata: {
              id: `phone-${phone.id}`,
              source: 'database',
              title: phone.name,
              tags: ['phone', 'overview', phone.brand.name],
              createdAt: new Date(),
              phoneId: phone.id,
              brand: phone.brand.name,
              category: phone.category.name,
              type: 'phone-overview',
            },
          }),
        );

        for (const variant of phone.variants) {
          const specs = variant.specifications
            .map((spec) => `- ${spec.specification.name}: ${spec.info}`)
            .join('\n');

          const price = variant.price.price;
          const discount = variant.discount?.discountPercent || 0;
          const finalPrice = price - (price * discount) / 100;

          documents.push(
            JSON.stringify({
              id: `variant-${variant.id}`,
              content: `# ${phone.name} - ${variant.variantName}
                        Màu sắc: ${variant.color.name}
                        Giá gốc: ${formatCurrency(price)}
                        Giảm giá: ${discount}%
                        Giá cuối: ${formatCurrency(finalPrice)}
                        
                        ## Thông số kỹ thuật
                        ${specs}`,
              metadata: {
                id: `variant-${variant.id}`,
                source: 'database',
                title: `${phone.name} - ${variant.variantName}`,
                tags: [
                  'phone',
                  'variant',
                  phone.brand.name,
                  variant.color.name,
                ],
                createdAt: new Date(),
                phoneId: phone.id,
                variantId: variant.id,
                brand: phone.brand.name,
                category: phone.category.name,
                color: variant.color.name,
                price: finalPrice,
                type: 'phone-variant',
              },
            }),
          );
        }
      }

      return documents;
    } catch (error: unknown) {
      console.error('Failed to fetch phone data:', error);
      throw AppError.from(new Error('Failed to fetch phone data'), 400)
        .withLog(`
                Failed to fetch phone data: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }

  private async readFromFile(): Promise<string[]> {
    try {
      const dataDir = this.configService.get<string>(
        'FILE_DATA_DIRECTORY',
        path.join(process.cwd(), 'data/files'),
      );

      if (!fs.existsSync(dataDir)) {
        console.warn(`Directory not found: ${dataDir}, creating it...`);
        fs.mkdirSync(dataDir, { recursive: true });
        return [];
      }

      const files = await fs.promises.readdir(dataDir);

      const supportedExtensions = ['.txt', '.md', '.json'];
      const validFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      });

      if (validFiles.length === 0) {
        console.warn(`No supported files found in directory: ${dataDir}`);
        return [];
      }

      const documents: string[] = [];

      for (const file of validFiles) {
        const filePath = path.join(dataDir, file);
        const fileExtension = path.extname(file).toLowerCase();
        const fileName = path.basename(file, fileExtension);

        let content: string;

        if (fileExtension === '.json') {
          const jsonContent = await fs.promises.readFile(filePath, 'utf-8');
          const jsonData = JSON.parse(jsonContent) as DocumentContent;

          if (jsonData.id && jsonData.content && jsonData.metadata) {
            documents.push(JSON.stringify(jsonData));
            continue;
          } else {
            content = JSON.stringify(jsonData, null, 2);
          }
        } else {
          content = await fs.promises.readFile(filePath, 'utf-8');
        }

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
      console.error('Failed to read from file:', error);
      throw AppError.from(new Error('Failed to read from file'), 400).withLog(`
                Failed to read from file: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }
}
