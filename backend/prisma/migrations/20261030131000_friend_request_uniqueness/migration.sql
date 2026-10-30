-- AlterTable
ALTER TABLE "friend_requests" ADD COLUMN     "requestKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "friend_requests_requestKey_status_key" ON "friend_requests"("requestKey", "status");
