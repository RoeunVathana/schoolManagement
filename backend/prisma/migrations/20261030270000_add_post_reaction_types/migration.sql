-- Expand post reactions to the Facebook-style reaction set.
ALTER TYPE "PostReactionType" ADD VALUE IF NOT EXISTS 'LOVE';
ALTER TYPE "PostReactionType" ADD VALUE IF NOT EXISTS 'HAHA';
ALTER TYPE "PostReactionType" ADD VALUE IF NOT EXISTS 'WOW';
ALTER TYPE "PostReactionType" ADD VALUE IF NOT EXISTS 'SAD';
ALTER TYPE "PostReactionType" ADD VALUE IF NOT EXISTS 'ANGRY';
