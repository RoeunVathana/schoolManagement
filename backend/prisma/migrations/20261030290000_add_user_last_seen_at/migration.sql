-- Store the latest authenticated heartbeat for online presence.
ALTER TABLE "users" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "users_role_lastSeenAt_idx" ON "users"("role", "lastSeenAt");
