CREATE INDEX "enrollments_studentId_status_idx" ON "enrollments"("studentId", "status");

CREATE INDEX "enrollments_courseId_status_idx" ON "enrollments"("courseId", "status");

CREATE INDEX "attendance_courseId_attendanceDate_idx" ON "attendance"("courseId", "attendanceDate");

CREATE INDEX "submissions_studentId_submittedAt_idx" ON "submissions"("studentId", "submittedAt");

CREATE INDEX "submissions_assignmentId_submittedAt_idx" ON "submissions"("assignmentId", "submittedAt");

CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

DROP INDEX IF EXISTS "enrollments_studentId_idx";

DROP INDEX IF EXISTS "enrollments_courseId_idx";

DROP INDEX IF EXISTS "submissions_studentId_idx";
