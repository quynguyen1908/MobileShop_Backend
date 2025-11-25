import { AgentContent, VectorMetadata } from '@app/contracts';
import { PhoneVariantDto } from '@app/contracts/phone/phone.dto';
import { Observable } from 'rxjs';

export interface IRagService {
  execute(query: string, token?: string): Promise<AgentContent[]>;
  executeStream(
    query: string,
    token?: string,
  ): Promise<Observable<AgentContent>>;
  getTopFeatures(dto: PhoneVariantDto): Promise<string>;
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
