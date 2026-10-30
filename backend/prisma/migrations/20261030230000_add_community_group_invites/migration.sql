-- CreateEnum
CREATE TYPE "CommunityGroupInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "community_group_invites" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "CommunityGroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_group_invites_inviteeId_status_createdAt_idx" ON "community_group_invites"("inviteeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "community_group_invites_inviterId_status_createdAt_idx" ON "community_group_invites"("inviterId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_group_invites_groupId_inviteeId_status_key" ON "community_group_invites"("groupId", "inviteeId", "status");

-- AddForeignKey
ALTER TABLE "community_group_invites" ADD CONSTRAINT "community_group_invites_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_invites" ADD CONSTRAINT "community_group_invites_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_invites" ADD CONSTRAINT "community_group_invites_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
