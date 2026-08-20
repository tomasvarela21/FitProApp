-- CreateTable
CREATE TABLE "TelegramLink" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLinkCode" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_trainerId_key" ON "TelegramLink"("trainerId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_chatId_key" ON "TelegramLink"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkCode_code_key" ON "TelegramLinkCode"("code");

-- CreateIndex
CREATE INDEX "TelegramLinkCode_trainerId_idx" ON "TelegramLinkCode"("trainerId");

-- AddForeignKey
ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkCode" ADD CONSTRAINT "TelegramLinkCode_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
