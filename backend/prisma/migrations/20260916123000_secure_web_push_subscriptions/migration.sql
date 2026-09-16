DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PushSubscription"
    WHERE "endpoint" IS NOT NULL
    GROUP BY "endpoint"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot secure Web Push subscriptions: duplicate endpoints exist';
  END IF;
END $$;

CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
ON "PushSubscription"("endpoint");
