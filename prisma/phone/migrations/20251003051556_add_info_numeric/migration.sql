/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `variant_images` table. All the data in the column will be lost.
  - Added the required column `image_url` to the `variant_images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."variant_images" DROP COLUMN "imageUrl",
ADD COLUMN     "image_url" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "public"."variant_specifications" ADD COLUMN     "info_numeric" DOUBLE PRECISION;
