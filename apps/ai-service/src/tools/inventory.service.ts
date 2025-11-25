import { CheckInventoryInput, checkInventorySchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { InventoryDto } from '@app/contracts/phone';
import { extractErrorMessage } from '@app/contracts/utils';
import { ApiResponseDto } from '@app/contracts/ai/ai.dto';
import { AppError } from '@app/contracts';

@Injectable()
export class InventoryToolService {
  private readonly inventoryServiceUrl: string;
  private readonly logger = new Logger(InventoryToolService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.inventoryServiceUrl = this.configService.get<string>(
      'INVENTORY_SERVICE_URL',
      'http://localhost:3000/api/v1/inventory',
    );
  }

  async checkInventory(
    phoneName: string,
    variantName: string,
  ): Promise<string> {
    try {
      const fullVariantName = `${phoneName} ${variantName}`;
      const { data: response } = await firstValueFrom(
        this.httpService
          .get<
            ApiResponseDto<InventoryDto[]>
          >(`${this.inventoryServiceUrl}/variant/${encodeURIComponent(fullVariantName)}`)
          .pipe(
            catchError((error: unknown) => {
              this.logger.error(
                `Error checking inventory for variant name ${fullVariantName}:`,
                error,
              );
              const errorMessage = extractErrorMessage(error);
              throw AppError.from(new Error(errorMessage), 400).withLog(
                `Failed to check inventory: ${errorMessage}`,
              );
            }),
          ),
      );

      const inventoryData = response?.data;
      if (
        inventoryData &&
        Array.isArray(inventoryData) &&
        inventoryData.length > 0
      ) {
        let result = `📋 Thông tin tồn kho cho sản phẩm: ${fullVariantName}\n\n`;

        // Calculate total stock across all colors
        const totalStock = inventoryData.reduce(
          (sum, inventory) => sum + inventory.stockQuantity,
          0,
        );
        result += `📦 Tổng số lượng trong kho: ${totalStock} sản phẩm\n\n`;

        // Show inventory for each color
        result += `📊 Chi tiết theo màu sắc:\n`;
        result += `${'='.repeat(40)}\n`;

        inventoryData.forEach((inventory, index) => {
          const colorName = inventory.color?.name || 'Không xác định';
          const sku = inventory.sku || 'N/A';
          const quantity = inventory.stockQuantity || 0;

          result += `\n${index + 1}. ${colorName}:\n`;
          result += `   🏷️  SKU: ${sku}\n`;
          result += `   📦 Số lượng: ${quantity} sản phẩm\n`;

          // Status per color
          result += `   📊 Trạng thái: `;
          if (quantity > 20) {
            result += `✅ Còn nhiều hàng\n`;
          } else if (quantity > 0) {
            result += `⚠️  Sắp hết hàng\n`;
          } else {
            result += `❌ Hết hàng\n`;
          }
        });

        // Overall status
        result += `\n${'='.repeat(40)}\n`;
        result += `📈 Tổng quan:\n`;

        if (totalStock > 50) {
          result += `✅ Trạng thái chung: Còn nhiều hàng\n`;
        } else if (totalStock > 10) {
          result += `⚠️  Trạng thái chung: Số lượng trung bình\n`;
        } else if (totalStock > 0) {
          result += `🔴 Trạng thái chung: Sắp hết hàng\n`;
        } else {
          result += `❌ Trạng thái chung: Hết hàng\n`;
        }

        result += `🆔 Mã biến thể: ${inventoryData[0].variantId}`;

        return result;
      }

      const errorDetail =
        typeof response?.errors === 'string'
          ? response.errors
          : JSON.stringify(response?.errors ?? '');

      return response?.errors
        ? `❌ Không thể lấy thông tin tồn kho: ${errorDetail}`
        : `❌ Không tìm thấy thông tin tồn kho cho sản phẩm "${fullVariantName}". Vui lòng kiểm tra lại tên sản phẩm.`;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to check inventory for variant ${phoneName}:`,
        error,
      );
      return `❌ Không thể kiểm tra tồn kho cho sản phẩm "${phoneName}". Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.`;
    }
  }

  createCheckInventoryTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: CheckInventoryInput): Promise<string> =>
        this.checkInventory(input.phoneName, input.variantName),
      {
        name: 'checkInventory',
        description: `Công cụ kiểm tra tồn kho sản phẩm trong hệ thống PHONEHUB.
        
        Sử dụng công cụ này khi khách hàng hỏi về:
        - Số lượng sản phẩm còn trong kho (tổng và theo màu)
        - Trạng thái tồn kho của một sản phẩm cụ thể  
        - Kiểm tra xem sản phẩm còn hàng hay không
        - Chi tiết tồn kho theo từng màu sắc
        
        Ví dụ câu hỏi từ khách hàng:
        - "Kiểm tra tồn kho iPhone 16 Pro Max 1TB"
        - "Samsung Galaxy S24 Ultra 1TB còn bao nhiêu?"
        - "iPhone 16 Pro Max 256 GB có những màu nào còn hàng?"
        
        Lưu ý:
        - Tool sẽ hiển thị tổng số lượng và chi tiết theo từng màu
        - Luôn hiển thị đầy đủ: Số lượng, trạng thái cho mỗi màu
        - Cung cấp tổng quan về tình trạng tồn kho chung
        - Không được hiển thị thông tin kỹ thuật nội bộ như mã SKU, mã biến thể, v.v.
        - Nếu bạn không chắc chắn về tên sản phẩm đầy đủ, hãy hỏi người dùng để lấy thông tin chính xác trước khi gọi công cụ này.
        - Nếu không tìm thấy sản phẩm, hãy trả lời rằng không tìm thấy thay vì đoán.
        - Cấu trúc tên sản phẩm thường là "<Thương hiệu> <Tên sản phẩm> <Dung lượng>". Ví dụ: "iPhone 16 Pro Max 1TB", "Samsung Galaxy S24 Ultra 512GB".
        - Phải truyền tên sản phẩm đúng định dạng như trên vào các biến "phoneName" và "variantName".`,
        schema: checkInventorySchema,
      },
    );
  }
}
