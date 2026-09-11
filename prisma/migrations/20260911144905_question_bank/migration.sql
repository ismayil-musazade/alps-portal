-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "BankSubject" (
    "id" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL DEFAULT 'SAT',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "blurb" TEXT,
    "accent" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDomain" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BankDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSkill" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BankSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSession" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "notes" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankQuestion" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "sessionId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "passage" TEXT,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "source" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAttempt" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "given" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "seconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSaved" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankSaved_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankSubject_slug_key" ON "BankSubject"("slug");

-- CreateIndex
CREATE INDEX "BankSubject_courseType_order_idx" ON "BankSubject"("courseType", "order");

-- CreateIndex
CREATE INDEX "BankDomain_subjectId_order_idx" ON "BankDomain"("subjectId", "order");

-- CreateIndex
CREATE INDEX "BankSkill_domainId_order_idx" ON "BankSkill"("domainId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BankSkill_domainId_slug_key" ON "BankSkill"("domainId", "slug");

-- CreateIndex
CREATE INDEX "BankSession_skillId_order_idx" ON "BankSession"("skillId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BankSession_skillId_order_key" ON "BankSession"("skillId", "order");

-- CreateIndex
CREATE INDEX "BankQuestion_skillId_order_idx" ON "BankQuestion"("skillId", "order");

-- CreateIndex
CREATE INDEX "BankQuestion_sessionId_idx" ON "BankQuestion"("sessionId");

-- CreateIndex
CREATE INDEX "BankAttempt_studentId_createdAt_idx" ON "BankAttempt"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "BankAttempt_studentId_questionId_idx" ON "BankAttempt"("studentId", "questionId");

-- CreateIndex
CREATE INDEX "BankAttempt_questionId_idx" ON "BankAttempt"("questionId");

-- CreateIndex
CREATE INDEX "BankSaved_studentId_idx" ON "BankSaved"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BankSaved_studentId_questionId_key" ON "BankSaved"("studentId", "questionId");

-- AddForeignKey
ALTER TABLE "BankDomain" ADD CONSTRAINT "BankDomain_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "BankSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSkill" ADD CONSTRAINT "BankSkill_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "BankDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSession" ADD CONSTRAINT "BankSession_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "BankSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "BankSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BankSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAttempt" ADD CONSTRAINT "BankAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAttempt" ADD CONSTRAINT "BankAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSaved" ADD CONSTRAINT "BankSaved_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSaved" ADD CONSTRAINT "BankSaved_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
