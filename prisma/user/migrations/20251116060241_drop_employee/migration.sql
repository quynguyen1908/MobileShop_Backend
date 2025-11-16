/*
  Warnings:

  - You are about to drop the `employees` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."employees" DROP CONSTRAINT "employees_user_id_fkey";

-- DropTable
DROP TABLE "public"."employees";
