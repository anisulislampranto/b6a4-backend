/*
  Warnings:

  - You are about to drop the column `slug` on the `Brand` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Brand_slug_key";

-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "slug";
