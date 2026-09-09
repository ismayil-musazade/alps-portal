-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('MANUAL', 'LEAD_FOLLOW_UP', 'STAFF_TASK');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('OLYMPIAD', 'EXAM', 'CERTIFICATE', 'COMPETITION', 'AWARD', 'OTHER');

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "kind" "ReminderKind" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "staffTaskId" TEXT;

-- AlterTable
ALTER TABLE "StaffTask" ADD COLUMN     "parentTaskId" TEXT;

-- CreateTable
CREATE TABLE "StaffTaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "studentId" TEXT,
    "title" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL DEFAULT 'OTHER',
    "result" TEXT,
    "achievedOn" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffTaskComment_taskId_createdAt_idx" ON "StaffTaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Achievement_leadId_idx" ON "Achievement"("leadId");

-- CreateIndex
CREATE INDEX "Achievement_studentId_idx" ON "Achievement"("studentId");

-- CreateIndex
CREATE INDEX "Message_recipientId_readAt_idx" ON "Message"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "Message_senderId_recipientId_createdAt_idx" ON "Message"("senderId", "recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_recipientId_senderId_createdAt_idx" ON "Message"("recipientId", "senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Reminder_staffTaskId_idx" ON "Reminder"("staffTaskId");

-- CreateIndex
CREATE INDEX "StaffTask_parentTaskId_idx" ON "StaffTask"("parentTaskId");

-- CreateIndex
CREATE INDEX "StaffTask_title_idx" ON "StaffTask"("title");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_staffTaskId_fkey" FOREIGN KEY ("staffTaskId") REFERENCES "StaffTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTask" ADD CONSTRAINT "StaffTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "StaffTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTaskComment" ADD CONSTRAINT "StaffTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "StaffTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTaskComment" ADD CONSTRAINT "StaffTaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
