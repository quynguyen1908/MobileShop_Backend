/*
  Warnings:

  - Added the required column `image_id` to the `brands` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "image_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "brands_image_id_idx" ON "brands"("image_id");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
