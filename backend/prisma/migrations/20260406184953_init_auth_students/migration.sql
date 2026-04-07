-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRAINER', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('INVITED', 'ACTIVE', 'PAUSED', 'INACTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "emailVerifiedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountInvitation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByTrainerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_userId_key" ON "Trainer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_trainerId_idx" ON "Student"("trainerId");

-- CreateIndex
CREATE INDEX "Student_email_idx" ON "Student"("email");

-- CreateIndex
CREATE INDEX "AccountInvitation_studentId_idx" ON "AccountInvitation"("studentId");

-- CreateIndex
CREATE INDEX "AccountInvitation_email_idx" ON "AccountInvitation"("email");

-- CreateIndex
CREATE INDEX "AccountInvitation_createdByTrainerId_idx" ON "AccountInvitation"("createdByTrainerId");

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_createdByTrainerId_fkey" FOREIGN KEY ("createdByTrainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
