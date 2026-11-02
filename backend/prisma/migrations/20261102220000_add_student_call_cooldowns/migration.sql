CREATE TABLE "student_call_cooldowns" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_call_cooldowns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_call_cooldowns_teacherId_courseId_studentId_key" ON "student_call_cooldowns"("teacherId", "courseId", "studentId");

CREATE INDEX "student_call_cooldowns_teacherId_courseId_calledAt_idx" ON "student_call_cooldowns"("teacherId", "courseId", "calledAt");

ALTER TABLE "student_call_cooldowns" ADD CONSTRAINT "student_call_cooldowns_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_call_cooldowns" ADD CONSTRAINT "student_call_cooldowns_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_call_cooldowns" ADD CONSTRAINT "student_call_cooldowns_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
