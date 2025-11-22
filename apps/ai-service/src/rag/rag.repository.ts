import { Injectable, Logger } from '@nestjs/common';
import { IRetrievalRepository } from './rag.port';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorMetadata } from '@app/contracts';
import { randomUUID } from 'crypto';

@Injectable()
export class RetrievalRepository implements IRetrievalRepository {
  private client: QdrantClient;
  private readonly collectionName: string;
  private readonly vectorSize: number;
  private readonly logger = new Logger(RetrievalRepository.name);

  constructor(private configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get<string>(
        'QDRANT_URL',
        'http://localhost:6333',
      ),
      apiKey: this.configService.get<string>('QDRANT__SERVICE__API_KEY', ''),
    });

    this.collectionName = this.configService.get<string>(
      'QDRANT_COLLECTION',
      'mobile_shop',
    );
    this.vectorSize = Number(
      this.configService.get<string>('VECTOR_SIZE') || 1536,
    );

    this.initializeCollection();
  }

  private async initializeCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.collectionName,
      );

      if (!collectionExists) {
        const payload = {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine' as const,
          },
        };

        await this.client.createCollection(this.collectionName, payload);

        this.logger.log(
          `Collection ${this.collectionName} created successfully`,
        );
      }
    } catch (error: unknown) {
      this.logger.error('Failed to initialize Qdrant collection:', error);
      throw new Error(
        `Failed to initialize Qdrant collection: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async upsertVector(
    vector: number[],
    metadata: VectorMetadata,
  ): Promise<void> {
    try {
      const pointId =
        metadata.id ||
        `vector_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const id = pointId.toString();

      const vectorId = randomUUID();

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: vectorId,
            vector,
            payload: {
              ...metadata,
              id: id,
            },
          },
        ],
      });

      this.logger.log(`Vector with ID ${id} upserted successfully`);
    } catch (error: unknown) {
      this.logger.error('Failed to upsert vector:', error);
      throw new Error(
        `Failed to upsert vector: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteVector(filter: Partial<VectorMetadata>): Promise<void> {
    try {
      const filterConditions = Object.entries(filter).map(([key, value]) => ({
        key,
        match: { value },
      }));

      if (filterConditions.length === 0) {
        throw new Error('At least one filter condition must be provided');
      }

      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: filterConditions,
        },
      });

      this.logger.log(
        `Vectors matching filter ${JSON.stringify(filter)} deleted successfully`,
      );
    } catch (error: unknown) {
      this.logger.error('Failed to delete vectors:', error);
      throw new Error(
        `Failed to delete vectors: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async querySimilar(
    queryVector: number[],
    topK: number,
  ): Promise<{ content: string; metadata: VectorMetadata }[]> {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: topK,
        with_payload: true,
        score_threshold: 0.5,
      });

      if (!searchResult || searchResult.length === 0) {
        this.logger.warn('No similar vectors found for the query');
        return [];
      }

      return searchResult.map((hit) => ({
        content: (hit.payload?.content as string) ?? '',
        metadata: {
          ...(hit.payload as VectorMetadata),
          score: hit.score ?? 0,
        },
      }));
    } catch (error: unknown) {
      this.logger.error('Failed to search similar vectors in Qdrant:', error);
      throw new Error(
        `Failed to search similar vectors: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
