ALTER TABLE "post_comments" ADD COLUMN "parentId" TEXT;

CREATE INDEX "post_comments_parentId_createdAt_idx" ON "post_comments"("parentId", "createdAt");

ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
