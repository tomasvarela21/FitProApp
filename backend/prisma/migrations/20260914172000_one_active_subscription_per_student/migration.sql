DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Subscription"
    WHERE "status" = 'ACTIVE'
    GROUP BY "studentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one active subscription per student: duplicate active subscriptions exist'
      USING HINT = 'Resolve each duplicate group explicitly before applying this migration; no records were changed.';
  END IF;
END $$;

CREATE UNIQUE INDEX "Subscription_one_active_per_student_key"
ON "Subscription"("studentId")
WHERE "status" = 'ACTIVE';
