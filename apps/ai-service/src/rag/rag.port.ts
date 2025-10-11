import { AgentContent, VectorMetadata } from '@app/contracts';
import { Observable } from 'rxjs';

export interface IRagService {
  execute(query: string): Promise<AgentContent[]>;
  executeStream(query: string): Promise<Observable<AgentContent>>;
}

export interface IRetrievalRepository
  extends IRetrievalCommandRepository,
    IRetrievalQueryRepository {}

export interface IRetrievalQueryRepository {
  querySimilar(
    queryVector: number[],
    topK: number,
  ): Promise<{ content: string; metadata: VectorMetadata }[]>;
}

export interface IRetrievalCommandRepository {
  upsertVector(vector: number[], metadata: VectorMetadata): Promise<void>;
  deleteVector(filter: Partial<VectorMetadata>): Promise<void>;
}
