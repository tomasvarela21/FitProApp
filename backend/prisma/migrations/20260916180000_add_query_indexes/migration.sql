CREATE INDEX "Student_trainerId_deletedAt_status_createdAt_idx"
ON "Student"("trainerId", "deletedAt", "status", "createdAt");

CREATE INDEX "Student_trainerId_gymId_idx"
ON "Student"("trainerId", "gymId");

CREATE INDEX "Subscription_trainerId_status_endDate_idx"
ON "Subscription"("trainerId", "status", "endDate");

CREATE INDEX "Installment_subscriptionId_status_dueDate_idx"
ON "Installment"("subscriptionId", "status", "dueDate");

CREATE INDEX "Installment_subscriptionId_status_number_idx"
ON "Installment"("subscriptionId", "status", "number");
