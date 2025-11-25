import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IRagService, IRetrievalRepository } from './rag.port';
import {
  AGENT_EXECUTOR,
  AgentContent,
  AppError,
  OPENAI_CHAT_MODEL,
  OPENAI_EMBEDDINGS,
  RETRIEVAL_REPOSITORY,
  VectorMetadata,
} from '@app/contracts';
import { AgentExecutor } from 'langchain/agents';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Observable } from 'rxjs';
import { FIXED_FEATURES, PhoneVariantDto } from '@app/contracts/phone';

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
    @Inject(OPENAI_CHAT_MODEL) private model: ChatOpenAI,
  ) {
    this.maxContextTokens = Number(
      this.configService.get<string>('MAX_CONTEXT_TOKENS') || 4000,
    );
  }

  async execute(query: string, token?: string): Promise<AgentContent[]> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);

      const similarResults = await this.retrievalRepository.querySimilar(
        queryEmbedding,
        5,
      );

      if (similarResults.length === 0) {
        this.logger.warn('No relevant documents found for query:', query);
      } else {
        this.logger.log(
          `Found ${similarResults.length} relevant documents for query:`,
          query,
        );
      }

      const context = this.buildContext(similarResults);

      this.logger.debug(
        `Starting RAG execution for query: ${query} with context length: ${context.length}`,
      );

      const { output } = await this.agentExecutor.invoke({
        input: query,
        chat_history: this.chatHistory,
        context: context,
        token: token,
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
      this.logger.error('Error executing RAG service:', error);
      throw AppError.from(new Error('Failed to process query'), 500).withLog(`
                    Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}
                `);
    }
  }

  async executeStream(
    query: string,
    token?: string,
  ): Promise<Observable<AgentContent>> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const similarResults = await this.retrievalRepository.querySimilar(
        queryEmbedding,
        10,
      );
      const context = this.buildContext(similarResults);

      this.logger.debug(
        `Starting RAG stream for query: ${query} with context length: ${context.length}`,
      );

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
            this.logger.log(
              'Starting stream with context length:',
              context.length,
            );

            const stream = await this.agentExecutor.stream({
              input: query,
              chat_history: this.chatHistory,
              context: context,
              token: token,
            });

            let buffer = '';
            let completeResponse = '';

            for await (const chunk of stream as AsyncIterable<{
              output?: string;
            }>) {
              if (isCancelled) {
                this.logger.log('Stream cancelled, stopping processing');
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

            this.logger.log(
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
            this.logger.error('Error in stream processing:', streamError);
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
          this.logger.log('Stream cleanup: marking as cancelled');
          isCancelled = true;
        };
      });
    } catch (error: unknown) {
      this.logger.error('Error setting up RAG streaming:', error);
      throw AppError.from(new Error('Failed to process streaming query'), 500)
        .withLog(`
                Failed to process streaming query: ${error instanceof Error ? error.message : 'Unknown error'}
            `);
    }
  }

  async getTopFeatures(dto: PhoneVariantDto): Promise<string> {
    const json = JSON.stringify(dto, null, 2);

    const prompt = `
      Bạn là một chuyên gia phân tích sản phẩm điện thoại di động. Dựa trên thông tin JSON chi tiết về điện thoại được cung cấp dưới đây, hãy xác định và chọn ra tối đa 3 tính năng nổi bật nhất
      trong danh sách cố định sau đây: ${JSON.stringify(FIXED_FEATURES)}.

      Yêu cầu đầu ra:
      1. Chọn TỐI ĐA 3 tính năng.
      2. **CHỈ trả về** các tính năng nổi bật nhất dưới dạng **một chuỗi duy nhất**, phân cách nhau bằng dấu chấm phẩy (';'), không kèm theo bất kỳ giải thích, tiêu đề, hoặc cấu trúc JSON nào khác.

      VÍ DỤ ĐỊNH DẠNG TRẢ VỀ: "Chơi game đỉnh cao; Dung lượng lưu trữ lớn; Thiết kế mỏng nhẹ"

      DỮ LIỆU ĐIỆN THOẠI: ${json}
    `;

    try {
      const messages = [new HumanMessage(prompt)];

      const response = await this.model.invoke(messages);

      const featuresString = response.content;

      if (typeof featuresString !== 'string') {
        throw new Error('LLM response content is not a string.');
      }

      return featuresString.trim();
    } catch (error) {
      this.logger.error('Error getting top features:', error);
      return '';
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
