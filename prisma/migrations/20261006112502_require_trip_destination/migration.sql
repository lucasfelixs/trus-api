-- Backfill legacy rows created while `destination` was optional.
-- 'Unknown' is a sentinel the owner can edit later; the column is required from now on.
UPDATE "trips" SET "destination" = 'Unknown' WHERE "destination" IS NULL;

-- AlterTable
ALTER TABLE "trips" ALTER COLUMN "destination" SET NOT NULL;
