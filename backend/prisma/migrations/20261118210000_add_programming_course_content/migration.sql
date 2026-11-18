CREATE TABLE "programming_course_content" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "codeLabel" TEXT,
    "tip" TEXT,
    "content" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programming_course_content_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programming_course_content_slug_key" ON "programming_course_content"("slug");
CREATE INDEX "programming_course_content_updatedAt_idx" ON "programming_course_content"("updatedAt");
