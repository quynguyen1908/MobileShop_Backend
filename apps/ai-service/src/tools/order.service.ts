import { TrackOrderInput, trackOrderSchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';

@Injectable()
export class OrderToolService {
  constructor() {}

  async trackOrder(orderId: string): Promise<string> {
    return Promise.resolve(
      `Order ${orderId} is currently in transit and will be delivered in 3 days.`,
    );
  }

  createTrackOrderTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: TrackOrderInput): Promise<string> =>
        this.trackOrder(input.orderId),
      {
        name: 'trackOrder',
        description: 'Call API to track the status of an order by its ID.',
        schema: trackOrderSchema,
      },
    );
  }
}
