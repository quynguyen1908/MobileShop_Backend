import { Module } from '@nestjs/common';
import { InventoryToolService } from './inventory.service';
import { OrderToolService } from './order.service';
import { ShipmentToolService } from './shipment.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.register({ timeout: 5000, maxRedirects: 5 }),
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [InventoryToolService, OrderToolService, ShipmentToolService],
  exports: [InventoryToolService, OrderToolService, ShipmentToolService],
})
export class ToolsModule {}
