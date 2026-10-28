-- Link local users to their Firebase Google identity.
ALTER TABLE "users" ADD COLUMN "firebaseUid" TEXT;

CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");
