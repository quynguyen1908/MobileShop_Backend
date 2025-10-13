import { CheckInventoryInput, checkInventorySchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Inventory } from '@app/contracts/phone';
import { extractErrorMessage, formatDate } from '@app/contracts/utils';
import { ApiResponseDto } from '@app/contracts/ai/ai.dto';
import { AppError } from '@app/contracts';

@Injectable()
export class InventoryToolService {
  private readonly inventoryServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.inventoryServiceUrl = this.configService.get<string>(
      'INVENTORY_SERVICE_URL',
      'http://localhost:3000/api/v1/inventory',
    );
  }

  async checkInventory(sku: string): Promise<string> {
    try {
      const { data: response } = await firstValueFrom(
        this.httpService
          .get<
            ApiResponseDto<Inventory>
          >(`${this.inventoryServiceUrl}/sku/${sku}`)
          .pipe(
            catchError((error: unknown) => {
              console.error(`Error checking inventory for SKU ${sku}:`, error);
              const errorMessage = extractErrorMessage(error);
              throw AppError.from(new Error(errorMessage), 400).withLog(
                `Failed to check inventory: ${errorMessage}`,
              );
            }),
          ),
      );

      const inventory = response?.data;
      if (inventory) {
        let result = `Thông tin tồn kho cho sản phẩm SKU: ${inventory.sku}\n\n`;
        result += `📦 Số lượng trong kho: ${inventory.stockQuantity} sản phẩm\n`;

        result +=
          inventory.stockQuantity > 20
            ? `✅ Trạng thái: Còn nhiều hàng\n`
            : inventory.stockQuantity > 0
              ? `⚠️ Trạng thái: Sắp hết hàng\n`
              : `❌ Trạng thái: Hết hàng\n`;

        const updatedAt = inventory.updatedAt
          ? formatDate(new Date(inventory.updatedAt))
          : 'Không xác định';

        result += `🕒 Cập nhật lần cuối: ${updatedAt}\n`;
        result += `🆔 Mã biến thể sản phẩm: ${inventory.variantId}`;

        return result;
      }

      const errorDetail =
        typeof response?.errors === 'string'
          ? response.errors
          : JSON.stringify(response?.errors ?? '');

      return response?.errors
        ? `Không thể lấy thông tin tồn kho: ${errorDetail}`
        : `Không tìm thấy thông tin tồn kho cho SKU ${sku}. Vui lòng kiểm tra lại mã SKU.`;
    } catch (error: unknown) {
      console.error(`Failed to check inventory for SKU ${sku}:`, error);
      return `Không thể kiểm tra tồn kho cho SKU ${sku}. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.`;
    }
  }

  createCheckInventoryTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: CheckInventoryInput): Promise<string> =>
        this.checkInventory(input.sku),
      {
        name: 'checkInventory',
        description: `Gọi API để kiểm tra tồn kho cho một SKU nhất định.
        Bất cứ câu hỏi nào liên quan đến việc kiểm tra số lượng sản phẩm trong kho, bạn nên sử dụng công cụ này.
        Ví dụ: "Kiểm tra tồn kho cho SKU 12345".
        Nếu bạn không chắc chắn về SKU, hãy hỏi người dùng để lấy SKU chính xác trước khi gọi công cụ này.
        Nếu bạn không biết câu trả lời, hãy trả lời rằng bạn không biết thay vì đoán.`,
        schema: checkInventorySchema,
      },
    );
  }
}
