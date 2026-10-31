-- A pair can send more than one request over time. The old composite unique
-- index blocked a new request after a previous request was rejected, cancelled
-- or accepted. Keep uniqueness only while a request is pending.
DROP INDEX IF EXISTS "friend_requests_requestKey_status_key";

CREATE INDEX IF NOT EXISTS "friend_requests_requestKey_status_idx"
  ON "friend_requests"("requestKey", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "friend_requests_pending_requestKey_key"
  ON "friend_requests"("requestKey")
  WHERE "status" = 'PENDING';
