-- Store multiple images/videos for a single community post.
CREATE TABLE "post_media" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "post_media_postId_sortOrder_idx" ON "post_media"("postId", "sortOrder");

ALTER TABLE "post_media" ADD CONSTRAINT "post_media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing one-media posts into the gallery table.
INSERT INTO "post_media" ("id", "postId", "url", "mediaType", "sortOrder")
SELECT 'legacy-' || "id", "id", "imageUrl", COALESCE("mediaType", 'IMAGE'::"MediaType"), 0
FROM "posts"
WHERE "imageUrl" IS NOT NULL;
