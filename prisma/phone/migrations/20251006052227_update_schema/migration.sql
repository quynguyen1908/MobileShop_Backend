/*
  Warnings:

  - You are about to drop the column `variantName` on the `phone_variants` table. All the data in the column will be lost.
  - You are about to drop the column `discountPercent` on the `variant_discounts` table. All the data in the column will be lost.
  - Added the required column `variant_name` to the `phone_variants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_percent` to the `variant_discounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "phone_variants" DROP COLUMN "variantName",
ADD COLUMN     "variant_name" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "variant_discounts" DROP COLUMN "discountPercent",
ADD COLUMN     "discount_percent" DECIMAL(5,2) NOT NULL;
