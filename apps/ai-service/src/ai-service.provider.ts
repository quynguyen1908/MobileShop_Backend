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
import { InventoryToolService } from './tools/inventory.service';
import { OrderToolService } from './tools/order.service';
import { ShipmentToolService } from './tools/shipment.service';

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
  useFactory: (
    inventoryService: InventoryToolService,
    orderService: OrderToolService,
    shipmentService: ShipmentToolService,
  ) => {
    const inventoryTool = inventoryService.createCheckInventoryTool();
    const orderTool = orderService.createTrackOrderTool();
    const shipmentTool = shipmentService.createShippingQuoteTool();
    return [inventoryTool, orderTool, shipmentTool];
  },
  inject: [InventoryToolService, OrderToolService, ShipmentToolService],
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
    
🎯 **NHIỆM VỤ (TRẢ LỜI THEO MARKDOWN):**
- Tư vấn khách hàng chọn điện thoại theo nhu cầu & ngân sách.
- So sánh thông số kỹ thuật giữa các mẫu điện thoại.
- Cung cấp thông tin bảo hành, đổi trả và khuyến mãi.
- Hướng dẫn đặt hàng, thanh toán và theo dõi đơn.

💡 **HƯỚNG DẪN TRẢ LỜI:**
1. Luôn hỏi rõ mục đích sử dụng & ngân sách.
2. Đề xuất từ 1–3 sản phẩm theo dạng danh sách Markdown (dùng "-" hoặc "1.")
3. Giải thích ngắn gọn, dễ hiểu (dưới 70 từ).
4. Không dùng HTML. Chỉ dùng Markdown.
5. Giữ thái độ chuyên nghiệp, thân thiện, kiên nhẫn.
6. Nếu không chắc chắn, hãy nói rõ thay vì đoán.

❗ Khi trả lời các câu hỏi liên quan đến sản phẩm, hãy sử dụng dữ liệu sản phẩm hiện có trong {context} để cung cấp thông tin chính xác và cập nhật nhất.
Nếu thông tin không có trong {context}, hãy nói "Xin lỗi, hiện tại hệ thống chưa có sản phẩm đó."

🧠 **Lưu ý:** Bạn có thể dùng công cụ để tra cứu tồn kho, phí giao hàng hoặc trạng thái đơn hàng nếu cần. Trả lời dưới dạng Markdown.`,
  ],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
  ['system', 'Dữ liệu sản phẩm hiện có:\n{context}'],
]);
