-- Backfill the sender for notifications created before senderId was added.
UPDATE "notifications" AS n
SET "senderId" = (
  SELECT a."createdBy"
  FROM "announcements" AS a
  WHERE a."title" = n."title"
    AND a."content" = n."message"
  ORDER BY a."createdAt" DESC
  LIMIT 1
)
WHERE n."senderId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "announcements" AS a
    WHERE a."title" = n."title"
      AND a."content" = n."message"
  );
