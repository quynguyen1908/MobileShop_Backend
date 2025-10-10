import { VectorMetadata } from '@app/contracts';

// export interface IGenerationService {

// }

export interface IRetrievalRepository
  extends IRetrievalCommandRepository,
    IRetrievalQueryRepository {}

export interface IRetrievalQueryRepository {
  querySimilar(
    queryVector: number[],
    topK: number,
  ): Promise<{ content: string; metadata: VectorMetadata }>;
}

export interface IRetrievalCommandRepository {
  upsertVector(vector: number[], metadata: VectorMetadata): Promise<void>;
  deleteVector(filter: Partial<VectorMetadata>): Promise<void>;
}
