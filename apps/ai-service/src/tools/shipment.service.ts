import { ShippingQuoteInput, shippingQuoteSchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';

@Injectable()
export class ShipmentToolService {
  constructor() {}

  async getShippingQuote(data: ShippingQuoteInput): Promise<string> {
    return Promise.resolve(
      `The shipping cost to ${data.address}, ${data.commune}, ${data.province} is $5.99.`,
    );
  }

  createShippingQuoteTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: ShippingQuoteInput): Promise<string> =>
        this.getShippingQuote(input),
      {
        name: 'getShippingQuote',
        description:
          'Call API to get a shipping quote based on the provided address, province, and commune.',
        schema: shippingQuoteSchema,
      },
    );
  }
}
