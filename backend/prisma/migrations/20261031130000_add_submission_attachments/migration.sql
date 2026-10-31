CREATE TABLE "submission_attachments" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "submission_attachments_submissionId_createdAt_idx" ON "submission_attachments"("submissionId", "createdAt");

ALTER TABLE "submission_attachments" ADD CONSTRAINT "submission_attachments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
