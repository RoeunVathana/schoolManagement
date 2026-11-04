CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_transactions_transactionHash_key" ON "payment_transactions"("transactionHash");
CREATE UNIQUE INDEX "payment_transactions_paymentId_key" ON "payment_transactions"("paymentId");
CREATE INDEX "payment_transactions_paymentType_paymentId_idx" ON "payment_transactions"("paymentType", "paymentId");
CREATE INDEX "registration_payments_transactionHash_idx" ON "registration_payments"("transactionHash");
CREATE INDEX "course_payments_transactionHash_idx" ON "course_payments"("transactionHash");

-- Preserve replay protection for payments that were already confirmed before
-- this ledger was introduced. If an old database ever contains the same hash
-- twice, keep the first record and let the audit log expose the duplicate.
INSERT INTO "payment_transactions" ("id", "transactionHash", "paymentType", "paymentId", "createdAt")
SELECT 'legacy-registration-' || "id", "transactionHash", 'REGISTRATION', "id", COALESCE("paidAt", "createdAt")
FROM "registration_payments"
WHERE "transactionHash" IS NOT NULL
ON CONFLICT ("transactionHash") DO NOTHING;

INSERT INTO "payment_transactions" ("id", "transactionHash", "paymentType", "paymentId", "createdAt")
SELECT 'legacy-course-' || "id", "transactionHash", 'COURSE', "id", COALESCE("paidAt", "createdAt")
FROM "course_payments"
WHERE "transactionHash" IS NOT NULL
ON CONFLICT ("transactionHash") DO NOTHING;
