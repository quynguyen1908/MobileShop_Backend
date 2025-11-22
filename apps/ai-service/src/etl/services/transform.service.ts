import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ITransformService } from '../etl.port';
import { AppError, OPENAI_EMBEDDINGS } from '@app/contracts';
import { OpenAIEmbeddings } from '@langchain/openai';

interface DocumentContent {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class TransformService implements ITransformService {
  private readonly logger = new Logger(TransformService.name);

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
        this.logger.error('Error cleaning document:', error);
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
                        id: `${id}-chunk${chunkIndex}`,
                        source: metadata.source || 'unknown',
                        title:
                          typeof metadata.title === 'string'
                            ? `${metadata.title} (Chunk ${chunkIndex})`
                            : undefined,
                        tags: metadata.tags || [],
                        createdAt: metadata.createdAt || new Date(),
                        parentId: id,
                        chunkIndex: chunkIndex,
                        ...metadata,
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
        this.logger.error('Error splitting document:', error);
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
            this.logger.error('Error parsing chunk for embeddings:', error);
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
            this.logger.warn('Rate limit exceeded, waiting before retrying...');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            i -= batchSize;
            continue;
          }
          throw error;
        }
      }
      return allEmbeddings;
    } catch (error: unknown) {
      this.logger.error('Error generating embeddings:', error);
      throw AppError.from(new Error('Failed to generate embeddings'), 500)
        .withLog(`
                Error generating embeddings: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }
}
