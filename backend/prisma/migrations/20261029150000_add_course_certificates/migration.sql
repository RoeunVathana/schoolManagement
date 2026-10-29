CREATE TABLE "course_certificates" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_certificates_courseId_studentId_key" ON "course_certificates"("courseId", "studentId");
CREATE INDEX "course_certificates_studentId_issuedAt_idx" ON "course_certificates"("studentId", "issuedAt");
CREATE INDEX "course_certificates_courseId_issuedAt_idx" ON "course_certificates"("courseId", "issuedAt");

ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
