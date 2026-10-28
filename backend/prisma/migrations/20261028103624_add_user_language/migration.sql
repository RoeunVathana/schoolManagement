-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';
