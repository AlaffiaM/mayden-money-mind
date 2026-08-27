-- Add a uniqueness guard so a duplicate episode for the same weekday (dayType + publishDate)
-- can never be inserted again. This is the root-cause fix for the duplicate rows created by
-- double-running the admin batch scheduler.
--
-- NOTE: This index can only be applied AFTER the existing duplicate rows are removed
-- (see prisma/dedupeEpisodes.js — run it in --apply mode first), because PostgreSQL will
-- refuse to create a unique index while duplicates already exist in the table.
CREATE UNIQUE INDEX "Episode_dayType_publishDate_key" ON "Episode"("dayType", "publishDate");
