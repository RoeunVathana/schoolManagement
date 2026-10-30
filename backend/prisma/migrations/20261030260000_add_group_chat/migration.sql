-- Add a shared conversation for each community group while keeping existing
-- one-to-one conversations in the same message/reaction tables.
ALTER TABLE "conversations" ADD COLUMN "groupId" TEXT;

ALTER TABLE "conversations" ALTER COLUMN "userAId" DROP NOT NULL;
ALTER TABLE "conversations" ALTER COLUMN "userBId" DROP NOT NULL;

CREATE UNIQUE INDEX "conversations_groupId_key" ON "conversations"("groupId");

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
