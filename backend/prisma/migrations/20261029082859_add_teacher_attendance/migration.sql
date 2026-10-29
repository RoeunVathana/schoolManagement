-- CreateTable
CREATE TABLE "teacher_attendance" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_attendance_attendanceDate_idx" ON "teacher_attendance"("attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendance_teacherId_attendanceDate_key" ON "teacher_attendance"("teacherId", "attendanceDate");

-- AddForeignKey
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "course_payments_courseId_studentId_paymentPlan_billingPeriod_ke" RENAME TO "course_payments_courseId_studentId_paymentPlan_billingPerio_key";
