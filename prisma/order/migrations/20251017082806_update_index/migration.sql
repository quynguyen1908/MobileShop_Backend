-- DropIndex
DROP INDEX "public"."cart_items_cart_id_variant_id_color_id_idx";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items"("variant_id");

-- CreateIndex
CREATE INDEX "cart_items_color_id_idx" ON "cart_items"("color_id");
