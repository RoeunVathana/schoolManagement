-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "price" DECIMAL(12,2) NOT NULL DEFAULT 1.00;

-- CreateTable
CREATE TABLE "course_payments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
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

    CONSTRAINT "course_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_payments_invoiceNumber_key" ON "course_payments"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "course_payments_publicToken_key" ON "course_payments"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "course_payments_md5Hash_key" ON "course_payments"("md5Hash");

-- CreateIndex
CREATE INDEX "course_payments_courseId_studentId_status_idx" ON "course_payments"("courseId", "studentId", "status");

-- CreateIndex
CREATE INDEX "course_payments_studentId_status_idx" ON "course_payments"("studentId", "status");

-- CreateIndex
CREATE INDEX "course_payments_status_expiresAt_idx" ON "course_payments"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
