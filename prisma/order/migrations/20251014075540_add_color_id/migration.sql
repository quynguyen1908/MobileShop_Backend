/*
  Warnings:

  - A unique constraint covering the columns `[order_id,variant_id,color_id]` on the table `order_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `color_id` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."order_items_order_id_variant_id_key";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "color_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "order_items_color_id_idx" ON "order_items"("color_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_variant_id_color_id_key" ON "order_items"("order_id", "variant_id", "color_id");
