/*
  Warnings:

  - You are about to drop the column `last_login` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "last_login",
ADD COLUMN     "last_change_pass" TIMESTAMPTZ;
