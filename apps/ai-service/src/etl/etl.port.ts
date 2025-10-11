import { SourceType } from '@app/contracts/ai';
import { VectorMetadata } from '@app/contracts/interface';

export interface IETLService {
  documentIngestion(): Promise<void>;
}

export interface IExtractService {
  readFromSource(type: SourceType): Promise<string[]>;
}

export interface ITransformService {
  cleanData(data: string[]): string[];
  splitData(data: string[], chunkSize?: number, overlap?: number): string[];
  generateEmbeddings(chunks: string[], batchSize?: number): Promise<number[][]>;
}

export interface ILoadService {
  saveToVectorStore(
    vectors: number[][],
    metadataList: VectorMetadata[],
  ): Promise<void>;
  removeOldVector(filter?: Partial<VectorMetadata>): Promise<void>;
}
