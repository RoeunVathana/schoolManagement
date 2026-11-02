ALTER TABLE "courses" ADD COLUMN "telegramChatId" TEXT;

CREATE INDEX "courses_telegramChatId_idx" ON "courses"("telegramChatId");
