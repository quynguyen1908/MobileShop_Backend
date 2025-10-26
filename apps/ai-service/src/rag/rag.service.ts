import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IRagService, IRetrievalRepository } from './rag.port';
import {
  AGENT_EXECUTOR,
  AgentContent,
  AppError,
  OPENAI_EMBEDDINGS,
  RETRIEVAL_REPOSITORY,
  VectorMetadata,
} from '@app/contracts';
import { AgentExecutor } from 'langchain/agents';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Observable } from 'rxjs';

@Injectable()
export class RagService implements IRagService {
  private chatHistory: (HumanMessage | AIMessage)[] = [];
  private readonly maxContextTokens: number;
  private readonly logger = new Logger(RagService.name);

  constructor(
    @Inject(AGENT_EXECUTOR) private agentExecutor: AgentExecutor,
    @Inject(OPENAI_EMBEDDINGS) private readonly embeddings: OpenAIEmbeddings,
    @Inject(RETRIEVAL_REPOSITORY)
    private readonly retrievalRepository: IRetrievalRepository,
    private readonly configService: ConfigService,
  ) {
    this.maxContextTokens = Number(
      this.configService.get<string>('MAX_CONTEXT_TOKENS') || 2000,
    );
  }

  async execute(query: string): Promise<AgentContent[]> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);

      const similarResults = await this.retrievalRepository.querySimilar(
        queryEmbedding,
        5,
      );

      if (similarResults.length === 0) {
        console.warn('No relevant documents found for query:', query);
      } else {
        console.log(
          `Found ${similarResults.length} relevant documents for query:`,
          query,
        );
      }

      const context = this.buildContext(similarResults);

      const { output } = await this.agentExecutor.invoke({
        input: query,
        chat_history: this.chatHistory,
        context: context,
      });

      this.chatHistory = this.chatHistory.concat([
        new HumanMessage(String(query)),
        new AIMessage(String(output)),
      ]);
      if (this.chatHistory.length > 10) this.chatHistory.splice(0, 2);
      return [
        {
          role: 'Human',
          content: query,
        },
        {
          role: 'Assistant',
          content: String(output),
        },
      ];
    } catch (error: unknown) {
      console.error('Error executing RAG service:', error);
      throw AppError.from(new Error('Failed to process query'), 500).withLog(`
                    Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}
                `);
    }
  }

  async executeStream(query: string): Promise<Observable<AgentContent>> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const similarResults = await this.retrievalRepository.querySimilar(
        queryEmbedding,
        5,
      );
      const context = this.buildContext(similarResults);

      this.logger.debug(`Starting RAG stream for query: ${query} with context length: ${context.length}`);

      return new Observable<AgentContent>((observer) => {
        observer.next({
          role: 'Human',
          content: query,
        });

        let isCancelled = false;
        let pendingChunks: Promise<void>[] = [];

        const processAndSendChunks = (text: string) => {
          const chars = text.split('');
          let currentIndex = 0;

          return new Promise<void>((resolve) => {
            const sendNextChunk = () => {
              if (isCancelled || currentIndex >= chars.length) {
                resolve();
                return;
              }

              const chunkSize = Math.min(
                Math.floor(Math.random() * 4) + 2,
                chars.length - currentIndex,
              );

              const chunk = chars
                .slice(currentIndex, currentIndex + chunkSize)
                .join('');
              currentIndex += chunkSize;

              observer.next({
                role: 'Assistant',
                content: chunk,
                isPartial: true,
              });

              if (currentIndex < chars.length) {
                setTimeout(sendNextChunk, Math.floor(Math.random() * 15) + 5);
              } else {
                resolve();
              }
            };

            sendNextChunk();
          });
        };

        (async () => {
          try {
            console.log('Starting stream with context length:', context.length);

            const stream = await this.agentExecutor.stream({
              input: query,
              chat_history: this.chatHistory,
              context: context,
            });

            let buffer = '';
            let completeResponse = '';

            for await (const chunk of stream as AsyncIterable<{
              output?: string;
            }>) {
              if (isCancelled) {
                console.log('Stream cancelled, stopping processing');
                break;
              }

              if (chunk.output) {
                buffer += chunk.output;
                completeResponse += chunk.output;

                if (buffer.length >= 10) {
                  const processingPromise = processAndSendChunks(buffer);
                  pendingChunks.push(processingPromise);
                  buffer = '';

                  processingPromise.then(() => {
                    pendingChunks = pendingChunks.filter(
                      (p) => p !== processingPromise,
                    );
                  });
                }
              }
            }

            if (buffer.length > 0 && !isCancelled) {
              const finalPromise = processAndSendChunks(buffer);
              pendingChunks.push(finalPromise);
            }

            await Promise.all(pendingChunks);

            console.log(
              'Stream complete, total response length:',
              completeResponse.length,
            );

            if (!isCancelled) {
              observer.next({
                role: 'Assistant',
                content: completeResponse,
                isPartial: false,
              });

              this.chatHistory = this.chatHistory.concat([
                new HumanMessage(String(query)),
                new AIMessage(String(completeResponse)),
              ]);
              if (this.chatHistory.length > 10) this.chatHistory.splice(0, 2);

              observer.complete();
            }
          } catch (streamError: unknown) {
            console.error('Error in stream processing:', streamError);
            if (!isCancelled) {
              observer.error(
                new Error(
                  `Stream processing error: ${
                    streamError instanceof Error
                      ? streamError.message
                      : 'Unknown error'
                  }`,
                ),
              );
            }
          }
        })();

        return () => {
          console.log('Stream cleanup: marking as cancelled');
          isCancelled = true;
        };
      });
    } catch (error: unknown) {
      console.error('Error setting up RAG streaming:', error);
      throw AppError.from(new Error('Failed to process streaming query'), 500)
        .withLog(`
                Failed to process streaming query: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }

  private buildContext(
    results: { content: string; metadata: VectorMetadata }[],
  ): string {
    if (results.length === 0) return '';

    results.sort(
      (a, b) =>
        (Number(b.metadata.score) || 0) - (Number(a.metadata.score) || 0),
    );

    let tokenCount = 0;
    const maxTokens = this.maxContextTokens;
    const contextParts: string[] = [];

    for (const result of results) {
      const content = result.content;

      // Estimate
      const contentTokens = Math.ceil(content.length / 4);

      if (tokenCount + contentTokens <= maxTokens) {
        contextParts.push(content);
        tokenCount += contentTokens;
      } else {
        const remainingTokens = maxTokens - tokenCount;
        if (remainingTokens > 100) {
          const truncatedContent = content.slice(0, remainingTokens * 4);
          contextParts.push(truncatedContent);
        }
        break;
      }
    }

    return contextParts.join('\n\n');
  }
}
