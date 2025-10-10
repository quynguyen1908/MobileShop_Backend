import { Inject, Injectable } from '@nestjs/common';
import { IExtractService, ILoadService, ITransformService } from './etl.port';
import { SourceType } from '@app/contracts/ai';
import { ConfigService } from '@nestjs/config/dist/config.service';
import axios from 'axios';
import { PhoneDto } from '@app/contracts/phone';
import {
  AppError,
  OPENAI_EMBEDDINGS,
  Paginated,
  VectorMetadata,
} from '@app/contracts';
import { formatCurrency } from '@app/contracts/utils';
import { OpenAIEmbeddings } from '@langchain/openai';
import type { IRetrievalRepository } from '../rag/rag.port';
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
        }>(phoneServiceUrl, {
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
              type: 'phone-overview',
              phoneId: phone.id,
              brand: phone.brand.name,
              category: phone.category.name,
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
                type: 'phone-variant',
                phoneId: phone.id,
                variantId: variant.id,
                brand: phone.brand.name,
                category: phone.category.name,
                color: variant.color.name,
                price: finalPrice,
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
              type: 'file',
              source: file,
              fileType: fileExtension,
              createAt: (await fs.promises.stat(filePath)).mtime.toISOString(),
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

@Injectable()
export class TransformService implements ITransformService {
  constructor(
    @Inject(OPENAI_EMBEDDINGS) private readonly embeddings: OpenAIEmbeddings,
  ) {}

  cleanData(data: string[]): string[] {
    const cleanedData = data.map((item) => {
      try {
        const parsed = JSON.parse(item) as DocumentContent;

        let content = parsed.content || '';

        const CONTROL_CHAR_REGEX = new RegExp(
          String.raw`[\u0000-\u001F\u007F-\u009F]`,
          'gu',
        );

        content = content.replace(CONTROL_CHAR_REGEX, ' ');
        content = content.replace(new RegExp('\\r\\n', 'g'), '\n');
        content = content.replace(new RegExp('\\n{3,}', 'g'), '\n\n');
        content = content.replace(new RegExp('\\s{2,}', 'g'), ' ');
        content = content.trim();

        return JSON.stringify({
          ...parsed,
          content: content,
        });
      } catch (error: unknown) {
        console.error('Error cleaning document:', error);
        return item;
      }
    });

    return cleanedData.filter((item) => {
      try {
        const parsed = JSON.parse(item) as DocumentContent;
        return !!parsed.content && parsed.content.length > 0;
      } catch {
        return false;
      }
    });
  }

  splitData(
    data: string[],
    chunkSize: number = 800,
    overlap: number = 100,
  ): string[] {
    const chunks: string[] = [];

    data.forEach((item) => {
      try {
        const doc = JSON.parse(item) as DocumentContent;
        const content: string = doc.content || '';
        const metadata = doc.metadata || {};
        const id = doc.id || '';

        if (content.length <= chunkSize) {
          chunks.push(item);
          return;
        }

        const paragraphs = content.split('\n\n');
        let currentChunk = '';
        let chunkIndex = 0;

        for (let i = 0; i < paragraphs.length; i++) {
          const paragraph = paragraphs[i];

          if (paragraph.length > chunkSize) {
            const sentences = paragraph.split(/(?<=[.!?])\s+/);
            let sentenceChunk = '';

            for (const sentence of sentences) {
              if ((sentenceChunk + sentence).length <= chunkSize) {
                sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
              } else {
                if (currentChunk) {
                  chunks.push(
                    JSON.stringify({
                      id: `${id}-chunk${chunkIndex}`,
                      content: currentChunk,
                      metadata: {
                        ...metadata,
                        parentId: id,
                        chunkIndex: chunkIndex,
                      },
                    }),
                  );
                  chunkIndex++;
                }
                currentChunk = sentenceChunk;
                sentenceChunk = sentence;
              }
            }

            if (sentenceChunk) {
              currentChunk += (currentChunk ? '\n\n' : '') + sentenceChunk;
            }
          } else if ((currentChunk + '\n\n' + paragraph).length > chunkSize) {
            chunks.push(
              JSON.stringify({
                id: `${id}-chunk${chunkIndex}`,
                content: currentChunk,
                metadata: {
                  ...metadata,
                  parentId: id,
                  chunkIndex: chunkIndex,
                },
              }),
            );
            chunkIndex++;

            const words = currentChunk.split(' ');
            const overlapText = words.slice(-overlap).join(' ');
            currentChunk = overlapText + '\n\n' + paragraph;
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          }
        }

        if (currentChunk) {
          chunks.push(
            JSON.stringify({
              id: `${id}-chunk${chunkIndex}`,
              content: currentChunk,
              metadata: {
                ...metadata,
                parentId: id,
                chunkIndex: chunkIndex,
              },
            }),
          );
        }
      } catch (error: unknown) {
        console.error('Error splitting document:', error);
        chunks.push(item);
      }
    });

    return chunks;
  }

  async generateEmbeddings(
    chunks: string[],
    batchSize: number = 20,
  ): Promise<number[][]> {
    try {
      const contents = chunks
        .map((chunk) => {
          try {
            const parsed = JSON.parse(chunk) as DocumentContent;
            return parsed.content || '';
          } catch (error: unknown) {
            console.error('Error parsing chunk for embeddings:', error);
            return '';
          }
        })
        .filter((content): content is string => content.trim().length > 0);

      if (contents.length === 0) return [];

      const allEmbeddings: number[][] = [];
      for (let i = 0; i < contents.length; i += batchSize) {
        const batchContents = contents.slice(i, i + batchSize);
        try {
          const batchEmbeddings =
            await this.embeddings.embedDocuments(batchContents);
          allEmbeddings.push(...batchEmbeddings);

          if (i + batchSize < contents.length)
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            (error.message?.includes('rate_limit') ||
              error.message?.includes('429'))
          ) {
            console.warn('Rate limit exceeded, waiting before retrying...');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            i -= batchSize;
            continue;
          }
          throw error;
        }
      }
      return allEmbeddings;
    } catch (error: unknown) {
      console.error('Error generating embeddings:', error);
      throw AppError.from(new Error('Failed to generate embeddings'), 500)
        .withLog(`
                Error generating embeddings: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }
}

@Injectable()
export class LoadService implements ILoadService {
  constructor(private readonly retrievalRepository: IRetrievalRepository) {}

  async saveToVectorStore(
    vectors: number[][],
    metadataList: VectorMetadata[],
  ): Promise<void> {
    try {
      if (vectors.length !== metadataList.length) {
        throw new Error(
          `Mismatch between vectors (${vectors.length}) and metadata (${metadataList.length})`,
        );
      }

      if (vectors.length === 0) {
        console.warn('No vectors to save');
        return;
      }

      for (let i = 0; i < vectors.length; i++) {
        try {
          await this.retrievalRepository.upsertVector(
            vectors[i],
            metadataList[i],
          );

          if ((i + 1) % 10 === 0 || i === vectors.length - 1) {
            console.log(`Progress: ${i + 1}/${vectors.length} vectors saved`);
          }

          if (i > 0 && i % 50 === 0 && i < vectors.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error: unknown) {
          console.error(`Error saving vector at index ${i}:`, error);
          throw AppError.from(
            new Error(`Failed to save vector at index ${i}`),
            500,
          ).withLog(`
                        Error saving vector at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}
                    `);
        }
      }
      console.log(
        `Successfully saved ${vectors.length} vectors to the database`,
      );
    } catch (error: unknown) {
      console.error('Error in saveToVectorStore:', error);
      throw AppError.from(new Error(`Failed to save vectors`), 500).withLog(`
                Error in saveToVectorStore: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }

  async removeOldVector(filter?: Partial<VectorMetadata>): Promise<void> {
    try {
      if (!filter || Object.keys(filter).length === 0) {
        console.warn(
          'No filter provided for vector removal, operation skipped',
        );
        return;
      }

      await this.retrievalRepository.deleteVector(filter);
      console.log(`Successfully deleted vectors matching filter:`, filter);
    } catch (error: unknown) {
      console.error('Error removing vectors from database:', error);
      throw AppError.from(new Error(`Failed to remove vectors`), 500).withLog(`
                Error removing vectors from database: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }
}
