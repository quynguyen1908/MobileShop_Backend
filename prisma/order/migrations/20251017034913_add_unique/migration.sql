/*
  Warnings:

  - You are about to drop the column `estimated_delivery_date` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `fee` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `tracking_code` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `customer_id` on the `shipment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customer_id]` on the table `carts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customer_id` to the `carts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_id` to the `shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `shipment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."cart_items" DROP CONSTRAINT "cart_items_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."carts" DROP CONSTRAINT "carts_order_id_fkey";

-- DropIndex
DROP INDEX "public"."carts_order_id_idx";

-- DropIndex
DROP INDEX "public"."shipment_customer_id_idx";

-- AlterTable
ALTER TABLE "carts" DROP COLUMN "estimated_delivery_date",
DROP COLUMN "fee",
DROP COLUMN "order_id",
DROP COLUMN "provider",
DROP COLUMN "status",
DROP COLUMN "tracking_code",
ADD COLUMN     "customer_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "shipment" DROP COLUMN "customer_id",
ADD COLUMN     "estimated_delivery_date" DATE,
ADD COLUMN     "fee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "order_id" INTEGER NOT NULL,
ADD COLUMN     "provider" VARCHAR(100) NOT NULL,
ADD COLUMN     "status" VARCHAR(50) NOT NULL,
ADD COLUMN     "tracking_code" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "carts_customer_id_key" ON "carts"("customer_id");

-- CreateIndex
CREATE INDEX "carts_customer_id_idx" ON "carts"("customer_id");

-- CreateIndex
CREATE INDEX "shipment_order_id_idx" ON "shipment"("order_id");

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
