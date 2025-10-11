import { Module } from '@nestjs/common';
import { InventoryToolService } from './inventory.service';
import { OrderToolService } from './order.service';
import { ShipmentToolService } from './shipment.service';

@Module({
  providers: [InventoryToolService, OrderToolService, ShipmentToolService],
  exports: [InventoryToolService, OrderToolService, ShipmentToolService],
})
export class ToolsModule {}
