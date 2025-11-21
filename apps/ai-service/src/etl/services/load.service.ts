import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ILoadService } from '../etl.port';
import { AppError, RETRIEVAL_REPOSITORY, VectorMetadata } from '@app/contracts';
import type { IRetrievalRepository } from '../../rag/rag.port';

@Injectable()
export class LoadService implements ILoadService {
  private readonly logger = new Logger(LoadService.name);

  constructor(
    @Inject(RETRIEVAL_REPOSITORY)
    private readonly retrievalRepository: IRetrievalRepository,
  ) {}

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
        this.logger.warn('No vectors to save');
        return;
      }

      for (let i = 0; i < vectors.length; i++) {
        try {
          await this.retrievalRepository.upsertVector(
            vectors[i],
            metadataList[i],
          );

          if ((i + 1) % 10 === 0 || i === vectors.length - 1) {
            this.logger.log(`Progress: ${i + 1}/${vectors.length} vectors saved`);
          }

          if (i > 0 && i % 50 === 0 && i < vectors.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error: unknown) {
          this.logger.error(`Error saving vector at index ${i}:`, error);
          throw AppError.from(
            new Error(`Failed to save vector at index ${i}`),
            500,
          ).withLog(`
                        Error saving vector at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}
                    `);
        }
      }
      this.logger.log(
        `Successfully saved ${vectors.length} vectors to the database`,
      );
    } catch (error: unknown) {
      this.logger.error('Error in saveToVectorStore:', error);
      throw AppError.from(new Error(`Failed to save vectors`), 500).withLog(`
                Error in saveToVectorStore: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }

  async removeOldVector(filter?: Partial<VectorMetadata>): Promise<void> {
    try {
      if (!filter || Object.keys(filter).length === 0) {
        this.logger.warn(
          'No filter provided for vector removal, operation skipped',
        );
        return;
      }

      await this.retrievalRepository.deleteVector(filter);
      this.logger.log(`Successfully deleted vectors matching filter:`, filter);
    } catch (error: unknown) {
      this.logger.error('Error removing vectors from database:', error);
      throw AppError.from(new Error(`Failed to remove vectors`), 500).withLog(`
                Error removing vectors from database: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }
}
