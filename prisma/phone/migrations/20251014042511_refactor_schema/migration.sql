/*
  Warnings:

  - You are about to drop the column `color_id` on the `phone_variants` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `phones` table. All the data in the column will be lost.
  - You are about to drop the column `phone_id` on the `reviews` table. All the data in the column will be lost.
  - You are about to alter the column `rating` on the `reviews` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to drop the column `image_url` on the `variant_images` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[variant_id,color_id]` on the table `inventories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customer_id,order_id,variant_id]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `color_id` to the `inventories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variant_id` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image_id` to the `variant_images` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."phone_variants" DROP CONSTRAINT "phone_variants_color_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reviews" DROP CONSTRAINT "reviews_phone_id_fkey";

-- DropIndex
DROP INDEX "public"."phone_variants_color_id_idx";

-- DropIndex
DROP INDEX "public"."reviews_customer_id_order_id_phone_id_key";

-- DropIndex
DROP INDEX "public"."reviews_phone_id_idx";

-- AlterTable
ALTER TABLE "inventories" ADD COLUMN     "color_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "phone_variants" DROP COLUMN "color_id",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "phones" DROP COLUMN "description";

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "phone_id",
ADD COLUMN     "variant_id" INTEGER NOT NULL,
ALTER COLUMN "rating" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "variant_images" DROP COLUMN "image_url",
ADD COLUMN     "image_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_colors" (
    "variant_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "image_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "variant_colors_pkey" PRIMARY KEY ("variant_id","color_id","image_id")
);

-- CreateIndex
CREATE INDEX "inventories_color_id_idx" ON "inventories"("color_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_variant_id_color_id_key" ON "inventories"("variant_id", "color_id");

-- CreateIndex
CREATE INDEX "reviews_variant_id_idx" ON "reviews"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_customer_id_order_id_variant_id_key" ON "reviews"("customer_id", "order_id", "variant_id");

-- CreateIndex
CREATE INDEX "variant_images_image_id_idx" ON "variant_images"("image_id");

-- AddForeignKey
ALTER TABLE "variant_colors" ADD CONSTRAINT "variant_colors_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "phone_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_colors" ADD CONSTRAINT "variant_colors_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_colors" ADD CONSTRAINT "variant_colors_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_images" ADD CONSTRAINT "variant_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "phone_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
