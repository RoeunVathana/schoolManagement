CREATE TABLE IF NOT EXISTS "teacher_telegram_settings" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_telegram_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_telegram_settings_teacherId_key"
  ON "teacher_telegram_settings"("teacherId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teacher_telegram_settings_teacherId_fkey'
  ) THEN
    ALTER TABLE "teacher_telegram_settings"
      ADD CONSTRAINT "teacher_telegram_settings_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
