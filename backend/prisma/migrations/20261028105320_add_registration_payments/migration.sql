-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "registration_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "qrString" TEXT NOT NULL,
    "md5Hash" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "transactionHash" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registration_payments_invoiceNumber_key" ON "registration_payments"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "registration_payments_publicToken_key" ON "registration_payments"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "registration_payments_md5Hash_key" ON "registration_payments"("md5Hash");

-- CreateIndex
CREATE INDEX "registration_payments_userId_status_idx" ON "registration_payments"("userId", "status");

-- CreateIndex
CREATE INDEX "registration_payments_status_expiresAt_idx" ON "registration_payments"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "registration_payments" ADD CONSTRAINT "registration_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
