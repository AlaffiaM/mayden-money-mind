-- Add lastListenedAt to ListenLog (backfill from createdAt) and a unique
-- constraint on (userId, episodeId) so one user listening to the same episode
-- many times never creates duplicate Library/listening-history rows.
--
-- NOTE: This migration is intentionally NOT applied to production yet — the
-- migration chain is currently blocked by the pre-existing failed migration
-- 20260827120000_unique_episode_daytype_publishdate (duplicate episodes in the
-- live DB). Apply this file only AFTER that blocker is resolved.

-- AlterTable
ALTER TABLE "ListenLog" ADD COLUMN     "lastListenedAt" TIMESTAMP(3);

-- Backfill lastListenedAt from createdAt (safe No-Op default) so existing rows
-- remain valid before the NOT NULL/updatedAt semantics take effect.
UPDATE "ListenLog" SET "lastListenedAt" = "createdAt";

ALTER TABLE "ListenLog" ALTER COLUMN "lastListenedAt" SET NOT NULL;

-- Deduplicate existing rows: for each (userId, episodeId) keep only the most
-- recently created row and delete the older duplicates, so the unique index
-- below can be created without failing.
DELETE FROM "ListenLog" a
USING "ListenLog" b
WHERE a."userId" = b."userId"
  AND a."episodeId" = b."episodeId"
  AND a."id" < b."id";

-- CreateIndex (unique per user + episode => the user's Library)
CREATE UNIQUE INDEX "ListenLog_userId_episodeId_key" ON "ListenLog"("userId", "episodeId");
