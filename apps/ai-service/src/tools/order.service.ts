import { TrackOrderInput, trackOrderSchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { HttpService } from '@nestjs/axios/dist/http.service';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { Order, OrderStatus } from '@app/contracts/order';
import { extractErrorMessage, formatCurrency } from '@app/contracts/utils';
import { formatDate } from '@app/contracts/utils';
import { AppError } from '@app/contracts';

interface OrderResponse {
  status: number;
  message: string;
  data: Order | null;
  errors: string | null;
}

@Injectable()
export class OrderToolService {
  private readonly orderServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.orderServiceUrl = this.configService.get<string>(
      'ORDER_SERVICE_URL',
      'http://localhost:3000/api/v1/orders',
    );
  }

  async trackOrder(orderCode: string): Promise<string> {
    try {
      const { data: response } = await firstValueFrom(
        this.httpService
          .get<OrderResponse>(`${this.orderServiceUrl}/code/${orderCode}`)
          .pipe(
            catchError((error: unknown) => {
              console.error(`Error tracking order ${orderCode}:`, error);
              const errorMessage = extractErrorMessage(error);
              throw AppError.from(new Error(errorMessage), 400).withLog(
                `Failed to track order: ${errorMessage}`,
              );
            }),
          ),
      );

      if (response.data && typeof response.data === 'object') {
        const order = response.data;

        const statusMap: Record<string, string> = {
          pending: 'Chờ xử lý',
          paid: 'Đã thanh toán',
          processing: 'Đang xử lý',
          shipped: 'Đã giao cho đơn vị vận chuyển',
          delivered: 'Đã giao hàng',
          canceled: 'Đã hủy',
          failed: 'Thất bại',
        };

        const orderStatus = order.status || 'unknown';
        const vietnameseStatus = statusMap[orderStatus] || orderStatus;

        let formattedOrderDate = 'Không xác định';
        try {
          if (order.orderDate) {
            const orderDate = new Date(order.orderDate);
            formattedOrderDate = formatDate(orderDate);
          }
        } catch (dateError) {
          console.error('Error formatting date:', dateError);
        }

        const totalAmount =
          typeof order.totalAmount === 'number' ? order.totalAmount : 0;
        const formattedAmount = formatCurrency(totalAmount);

        let result = `📦 Thông tin đơn hàng: ${order.orderCode}\n\n`;
        result += `🔹 Trạng thái: ${vietnameseStatus}\n`;
        result += `🔹 Ngày đặt hàng: ${formattedOrderDate}\n`;
        result += `🔹 Tổng giá trị: ${formattedAmount}\n\n`;

        result += `👤 Thông tin người nhận:\n`;
        result += `🔹 Họ tên: ${order.recipientName}\n`;
        result += `🔹 Số điện thoại: ${order.recipientPhone}\n`;
        result += `🔹 Địa chỉ: ${order.street}\n\n`;

        switch (order.status) {
          case OrderStatus.PENDING:
            result += `⏳ Đơn hàng của bạn đang chờ xác nhận từ hệ thống. Vui lòng chờ trong 24 giờ tới.`;
            break;
          case OrderStatus.PAID:
            result += `✅ Đơn hàng đã được thanh toán thành công và đang chờ xử lý. Chúng tôi sẽ cập nhật trạng thái sớm nhất có thể.`;
            break;
          case OrderStatus.PROCESSING:
            result += `⚙️ Đơn hàng của bạn đang được xử lý và chuẩn bị hàng. Bạn sẽ nhận được thông báo khi đơn hàng được giao cho đơn vị vận chuyển.`;
            break;
          case OrderStatus.SHIPPED:
            result += `🚚 Đơn hàng đã được giao cho đơn vị vận chuyển. Bạn sẽ nhận được hàng trong vòng 2-3 ngày làm việc.`;
            break;
          case OrderStatus.DELIVERED:
            result += `✅ Đơn hàng đã được giao thành công. Cảm ơn bạn đã mua sắm cùng chúng tôi!`;
            break;
          case OrderStatus.CANCELED:
            result += `❌ Đơn hàng đã bị hủy. Nếu bạn có thắc mắc, vui lòng liên hệ với bộ phận Chăm sóc Khách hàng.`;
            break;
          case OrderStatus.FAILED:
            result += `⚠️ Đơn hàng không thành công do lỗi thanh toán. Vui lòng thử lại hoặc sử dụng phương thức thanh toán khác.`;
            break;
          default:
            result += `Để biết thêm chi tiết về đơn hàng, vui lòng liên hệ với bộ phận Chăm sóc Khách hàng.`;
        }

        return result;
      } else if (response.errors) {
        return `Không thể tra cứu thông tin đơn hàng: ${response.errors}`;
      } else {
        return `Không tìm thấy thông tin đơn hàng với mã ${orderCode}. Vui lòng kiểm tra lại mã đơn hàng.`;
      }
    } catch (error: unknown) {
      console.error(`Failed to track order ${orderCode}:`, error);
      return `Không thể tra cứu thông tin đơn hàng ${orderCode}. Vui lòng thử lại sau hoặc liên hệ với bộ phận Chăm sóc Khách hàng.`;
    }
  }

  createTrackOrderTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: TrackOrderInput): Promise<string> =>
        this.trackOrder(input.orderCode),
      {
        name: 'trackOrder',
        description: `Công cụ theo dõi trạng thái đơn hàng trong hệ thống PHONEHUB.
        
        Sử dụng công cụ này khi khách hàng hỏi về:
        - Trạng thái hiện tại của đơn hàng
        - Tiến độ xử lý đơn hàng (đang chuẩn bị, đang giao, đã giao)
        
        Ví dụ câu hỏi từ khách hàng:
        - "Theo dõi đơn hàng PH0211259191"
        - "Đơn hàng PH1211255447 đến đâu rồi?"
        - "Xem tình trạng đơn hàng PH3010257917"
        
        Lưu ý:
        - Tool sẽ hiển thị đầy đủ thông tin trạng thái đơn hàng
        - Luôn hiển thị: Trạng thái hiện tại, ngày đặt hàng, thông tin người nhận
        - Không được hiển thị thông tin kỹ thuật nội bộ như ID hệ thống, ngày cập nhật, v.v.
        - Nếu bạn không chắc chắn về mã đơn hàng, hãy hỏi người dùng để lấy mã chính xác trước khi gọi công cụ này
        - Nếu không tìm thấy đơn hàng, hãy trả lời rằng không tìm thấy thay vì đoán
        - Mã đơn hàng thường có format: PH + số`,
        schema: trackOrderSchema,
      },
    );
  }
}
