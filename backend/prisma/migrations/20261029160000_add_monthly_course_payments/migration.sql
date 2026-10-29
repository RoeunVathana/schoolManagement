CREATE TYPE "CoursePaymentPlan" AS ENUM ('FULL', 'MONTHLY');

ALTER TABLE "courses"
  ADD COLUMN "monthlyPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "monthlyPrice" DECIMAL(12, 2);

ALTER TABLE "course_payments"
  ADD COLUMN "paymentPlan" "CoursePaymentPlan" NOT NULL DEFAULT 'FULL',
  ADD COLUMN "billingPeriod" TEXT;

CREATE UNIQUE INDEX "course_payments_courseId_studentId_paymentPlan_billingPeriod_key"
  ON "course_payments"("courseId", "studentId", "paymentPlan", "billingPeriod");
