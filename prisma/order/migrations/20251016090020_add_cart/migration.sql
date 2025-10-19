/*
  Warnings:

  - You are about to drop the column `estimated_delivery_date` on the `shipment` table. All the data in the column will be lost.
  - You are about to drop the column `fee` on the `shipment` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `shipment` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `shipment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `shipment` table. All the data in the column will be lost.
  - You are about to drop the column `tracking_code` on the `shipment` table. All the data in the column will be lost.
  - Added the required column `customer_id` to the `shipment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."shipment" DROP CONSTRAINT "shipment_order_id_fkey";

-- DropIndex
DROP INDEX "public"."shipment_order_id_idx";

-- AlterTable
ALTER TABLE "shipment" DROP COLUMN "estimated_delivery_date",
DROP COLUMN "fee",
DROP COLUMN "order_id",
DROP COLUMN "provider",
DROP COLUMN "status",
DROP COLUMN "tracking_code",
ADD COLUMN     "customer_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "carts" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "tracking_code" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "estimated_delivery_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "cart_id" INTEGER NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carts_order_id_idx" ON "carts"("order_id");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_variant_id_color_id_idx" ON "cart_items"("cart_id", "variant_id", "color_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_variant_id_color_id_key" ON "cart_items"("cart_id", "variant_id", "color_id");

-- CreateIndex
CREATE INDEX "shipment_customer_id_idx" ON "shipment"("customer_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
