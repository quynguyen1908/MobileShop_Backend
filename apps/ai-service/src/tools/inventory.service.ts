import { CheckInventoryInput, checkInventorySchema } from '@app/contracts/ai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';

@Injectable()
export class InventoryToolService {
  constructor() {}

  async checkInventory(sku: string): Promise<string> {
    return Promise.resolve(`Inventory for SKU ${sku} is 42 units.`);
  }

  createCheckInventoryTool(): DynamicStructuredTool<any> {
    return tool(
      async (input: CheckInventoryInput): Promise<string> =>
        this.checkInventory(input.sku),
      {
        name: 'checkInventory',
        description: 'Call API to check inventory for a given SKU.',
        schema: checkInventorySchema,
      },
    );
  }
}
