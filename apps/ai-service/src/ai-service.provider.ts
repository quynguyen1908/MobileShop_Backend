import {
  AGENT_EXECUTOR,
  AGENT_TOOLS,
  OPENAI_CHAT_MODEL,
  OPENAI_EMBEDDINGS,
} from '@app/contracts';
import { Provider } from '@nestjs/common';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { OpenAIConfig } from '@app/contracts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { Tool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const OpenAIEmbeddingsProvider: Provider<OpenAIEmbeddings> = {
  provide: OPENAI_EMBEDDINGS,
  useFactory: (configService: ConfigService) => {
    const { apiKey, embeddingModel } =
      configService.get<OpenAIConfig>('openai') ?? {};
    return new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: embeddingModel,
    });
  },
  inject: [ConfigService],
};

export const OpenAIChatModelProvider: Provider<ChatOpenAI> = {
  provide: OPENAI_CHAT_MODEL,
  useFactory: (configService: ConfigService) => {
    const { apiKey, chatModel } =
      configService.get<OpenAIConfig>('openai') ?? {};
    return new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: chatModel,
      temperature: 0.3,
      maxTokens: 2048,
    });
  },
  inject: [ConfigService],
};

export const AgentToolsProvider: Provider<Tool[]> = {
  provide: AGENT_TOOLS,
  useFactory: () => {
    // TODO: Define and return your tools here
    return [];
  },
  inject: [],
};

export const AgentExecutorProvider: Provider<AgentExecutor> = {
  provide: AGENT_EXECUTOR,
  useFactory: (llm: ChatOpenAI, tools: Tool[]) => {
    const agent = createToolCallingAgent({ llm, tools, prompt });

    return AgentExecutor.fromAgentAndTools({
      agent,
      tools,
      verbose: true,
    });
  },
  inject: [OPENAI_CHAT_MODEL, AGENT_TOOLS],
};

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là trợ lý AI của **PHONEHUB** – nền tảng bán điện thoại di động hàng đầu Việt Nam.
        <br><br>
        🎯 **NHIỆM VỤ:**
        - Tư vấn khách hàng chọn điện thoại phù hợp với nhu cầu và ngân sách.
        - So sánh thông số kỹ thuật giữa các mẫu điện thoại.
        - Cung cấp thông tin về bảo hành, đổi trả và khuyến mãi hiện có.
        - Hướng dẫn quy trình đặt hàng, thanh toán và theo dõi đơn.
        <br>
        💡 **HƯỚNG DẪN TRAO ĐỔI:**
        1. Luôn hỏi rõ mục đích sử dụng & ngân sách của khách hàng.
        2. Đề xuất 1–3 sản phẩm phù hợp.
        3. Giải thích ngắn gọn, dễ hiểu (dưới 70 từ).
        4. Sử dụng thẻ HTML (<ul>, <ol>, <br>) để định dạng.
        5. Giữ thái độ chuyên nghiệp, thân thiện, kiên nhẫn.
        6. Nếu không chắc chắn, hãy nói rõ thay vì đoán.
        <br>
        🧠 **Lưu ý:** Bạn có thể dùng công cụ sẵn có để tra cứu sản phẩm, giá, khuyến mãi, hoặc quy trình đơn hàng nhằm trả lời chính xác nhất.`,
  ],
  ['placeholder', '{chat_history}'],
  ['placeholder', '{context}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);
