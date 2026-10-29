ALTER TABLE "exam_results" ALTER COLUMN "score" DROP NOT NULL;

ALTER TABLE "exam_results" ADD COLUMN "answerText" TEXT;
ALTER TABLE "exam_results" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "exam_results" ADD COLUMN "submittedAt" TIMESTAMP(3);
