-- Existing accounts receive version 1. Incrementing it invalidates older access tokens.
ALTER TABLE "User"
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 1;
