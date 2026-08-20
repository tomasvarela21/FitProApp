-- CreateIndex
CREATE INDEX "Installment_trainerId_status_dueDate_idx" ON "Installment"("trainerId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "StudentRoutine_studentId_isActive_idx" ON "StudentRoutine"("studentId", "isActive");

-- CreateIndex
CREATE INDEX "WorkoutLog_studentRoutineId_date_idx" ON "WorkoutLog"("studentRoutineId", "date");
