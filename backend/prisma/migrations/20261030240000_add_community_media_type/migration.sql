CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

ALTER TABLE "posts" ADD COLUMN "mediaType" "MediaType";

ALTER TABLE "stories" ADD COLUMN "mediaType" "MediaType";
