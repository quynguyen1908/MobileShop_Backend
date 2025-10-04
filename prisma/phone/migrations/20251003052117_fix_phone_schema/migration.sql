/*
  Warnings:

  - You are about to drop the column `info_numeric` on the `variant_specifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."variant_specifications" DROP COLUMN "info_numeric",
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "value_numeric" DOUBLE PRECISION;
