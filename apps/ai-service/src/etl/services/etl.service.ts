import { Injectable, Logger } from '@nestjs/common';
import type { IETLService } from '../etl.port';
import { SourceType } from '@app/contracts/ai';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { AppError, VectorMetadata } from '@app/contracts';
import { ExtractService } from './extract.service';
import { TransformService } from './transform.service';
import { LoadService } from './load.service';

interface DocumentContent {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class ETLService implements IETLService {
  private readonly logger = new Logger(ETLService.name);

  constructor(
    private readonly extractService: ExtractService,
    private readonly transformService: TransformService,
    private readonly loadService: LoadService,
    private readonly configService: ConfigService,
  ) {}

  async documentIngestion(): Promise<void> {
    try {
      this.logger.log('Starting document ingestion process...');
      const startTime = Date.now();

      // Extraction
      this.logger.log('Step 1: Extracting data from sources...');

      const dbDocuments = await this.extractService.readFromSource(
        SourceType.DATABASE,
      );
      this.logger.log(
        `Extracted ${dbDocuments.length} documents from database`,
      );

      const fileDocuments = await this.extractService.readFromSource(
        SourceType.FILE,
      );
      this.logger.log(`Extracted ${fileDocuments.length} documents from files`);

      const allDocuments = [...dbDocuments, ...fileDocuments];

      if (allDocuments.length === 0) {
        this.logger.warn('No documents extracted, aborting ingestion process');
        return;
      }

      // Transformation
      this.logger.log('Step 2: Transforming documents...');

      const cleanedDocuments = this.transformService.cleanData(allDocuments);
      this.logger.log(`Cleaned ${cleanedDocuments.length} documents`);

      const chunkSize = this.configService.get<number>('CHUNK_SIZE', 800);
      const overlap = this.configService.get<number>('CHUNK_OVERLAP', 100);
      const chunks = this.transformService.splitData(
        cleanedDocuments,
        chunkSize,
        overlap,
      );
      this.logger.log(`Split into ${chunks.length} chunks`);

      const batchSize = this.configService.get<number>(
        'EMBEDDING_BATCH_SIZE',
        20,
      );
      this.logger.log(`Generating embeddings with batch size ${batchSize}...`);
      const embeddings = await this.transformService.generateEmbeddings(
        chunks,
        batchSize,
      );
      this.logger.log(`Generated ${embeddings.length} embeddings`);

      // Loading
      this.logger.log('Step 3: Loading vectors into database...');

      const metadataList: VectorMetadata[] = chunks.map((chunk, index) => {
        try {
          const parsed = JSON.parse(chunk) as DocumentContent;

          const metadata: VectorMetadata = {
            id: parsed.id || `chunk-${index}`,
            source:
              parsed.metadata && typeof parsed.metadata['source'] === 'string'
                ? parsed.metadata['source']
                : 'unknown',
            title: (parsed.metadata?.title as string) || undefined,
            tags: (parsed.metadata?.tags as string[]) || undefined,
            createdAt: parsed.metadata?.createdAt
              ? new Date(parsed.metadata.createdAt as string)
              : new Date(),
            content: parsed.content,
          };

          for (const [key, value] of Object.entries(parsed.metadata || {})) {
            if (!['id', 'source', 'title', 'tags', 'createdAt'].includes(key)) {
              (metadata as Record<string, unknown>)[key] = value;
            }
          }

          return metadata;
        } catch (error: unknown) {
          this.logger.error('Error parsing chunk for metadata:', error);
          return {
            id: `unknown-${index}`,
            source: 'unknown',
            title: `Unknown Document ${index}`,
            createdAt: new Date(),
            content: '',
          } as VectorMetadata;
        }
      });

      const replaceExisting = this.configService.get<boolean>(
        'REPLACE_EXISTING_VECTORS',
        true,
      );
      if (replaceExisting) {
        const types = new Set<string>();
        metadataList.forEach((metadata) => {
          if (metadata.type) {
            types.add(metadata.type as string);
          }
        });

        for (const type of types) {
          await this.loadService.removeOldVector({ type });
          this.logger.log(`Removed existing vectors with type: ${type}`);
        }
      }

      await this.loadService.saveToVectorStore(embeddings, metadataList);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      this.logger.log(`Document ingestion completed in ${duration}s`);
      this.logger.log(
        `Successfully processed ${chunks.length} chunks and saved ${embeddings.length} vectors`,
      );
    } catch (error: unknown) {
      this.logger.error('Document ingestion failed:', error);
      throw AppError.from(new Error('Document ingestion process failed'), 500)
        .withLog(`
              Document ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}
          `);
    }
  }
}
