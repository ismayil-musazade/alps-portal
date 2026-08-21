-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'STAFF', 'TEACHER', 'STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'PLACEMENT_BOOKED', 'PLACEMENT_DONE', 'TRIAL_BOOKED', 'INTERESTED', 'WAITING_DECISION', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INSTAGRAM', 'WHATSAPP', 'REFERRAL', 'WALK_IN', 'PHONE_CALL', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'FROZEN', 'COMPLETED', 'DROPPED', 'WAITING_GROUP');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('IELTS', 'SAT', 'GENERAL_ENGLISH', 'OTHER');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'FINISHED', 'PLANNED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('PRACTICE_TEST', 'VOCAB_LIST', 'READING_ARTICLE', 'HOMEWORK', 'WRITING_TASK', 'SPEAKING_TASK', 'SKILL_CHECKLIST', 'EXAM_REVIEW');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'MISSING', 'LATE');

-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('NOT_STARTED', 'LEARNING', 'NEEDS_IMPROVEMENT', 'GOOD', 'MASTERED');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('PLACEMENT', 'PROGRESS', 'MOCK', 'FINAL');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('MANAGER_ONLY', 'STAFF', 'TEACHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'STATUS_CHANGE', 'FOLLOW_UP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "parentName" TEXT,
    "parentPhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "school" TEXT,
    "gradeLevel" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "interestedCourse" "CourseType",
    "currentLevel" TEXT,
    "targetScore" TEXT,
    "preferredSchedule" TEXT,
    "groupPreference" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "responsibleStaffId" TEXT,
    "firstContactAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "lastContactNote" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "leadId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "parentName" TEXT,
    "parentPhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "school" TEXT,
    "gradeLevel" TEXT,
    "currentLevel" TEXT,
    "previousScores" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "learningNotes" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentLink" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ParentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CourseType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT,
    "schedule" TEXT,
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "groupId" TEXT,
    "teacherId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "targetOverall" TEXT,
    "subTargets" JSONB,
    "targetExamDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "title" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "skillArea" TEXT,
    "defaultOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTask" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "teacherApproved" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "scoreMax" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "comment" TEXT,
    "mistakeReviewDone" BOOLEAN NOT NULL DEFAULT false,
    "studentSubmittedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSkillStatus" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "skill" TEXT NOT NULL,
    "status" "SkillStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSkillStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "examType" "ExamType" NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "sectionScores" JSONB,
    "totalScore" TEXT,
    "teacherComment" TEXT,
    "recommendedAction" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "lessonDate" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metrics" JSONB,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "nextTarget" TEXT,
    "teacherComment" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "leadId" TEXT,
    "authorId" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'STAFF',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_responsibleStaffId_idx" ON "Lead"("responsibleStaffId");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_leadId_key" ON "StudentProfile"("leadId");

-- CreateIndex
CREATE INDEX "StudentProfile_status_idx" ON "StudentProfile"("status");

-- CreateIndex
CREATE INDEX "StudentProfile_fullName_idx" ON "StudentProfile"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "ParentLink_parentUserId_studentId_key" ON "ParentLink"("parentUserId", "studentId");

-- CreateIndex
CREATE INDEX "Group_teacherId_idx" ON "Group"("teacherId");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "Enrollment_groupId_idx" ON "Enrollment"("groupId");

-- CreateIndex
CREATE INDEX "Enrollment_teacherId_idx" ON "Enrollment"("teacherId");

-- CreateIndex
CREATE INDEX "Goal_studentId_idx" ON "Goal"("studentId");

-- CreateIndex
CREATE INDEX "TaskTemplate_courseType_idx" ON "TaskTemplate"("courseType");

-- CreateIndex
CREATE INDEX "StudentTask_studentId_status_idx" ON "StudentTask"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSkillStatus_studentId_skill_key" ON "StudentSkillStatus"("studentId", "skill");

-- CreateIndex
CREATE INDEX "Exam_studentId_examType_idx" ON "Exam"("studentId", "examType");

-- CreateIndex
CREATE INDEX "Attendance_groupId_lessonDate_idx" ON "Attendance"("groupId", "lessonDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_groupId_lessonDate_key" ON "Attendance"("studentId", "groupId", "lessonDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_studentId_period_key" ON "ReportCard"("studentId", "period");

-- CreateIndex
CREATE INDEX "InternalNote_studentId_idx" ON "InternalNote"("studentId");

-- CreateIndex
CREATE INDEX "InternalNote_leadId_idx" ON "InternalNote"("leadId");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_responsibleStaffId_fkey" FOREIGN KEY ("responsibleStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLink" ADD CONSTRAINT "ParentLink_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentLink" ADD CONSTRAINT "ParentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTask" ADD CONSTRAINT "StudentTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTask" ADD CONSTRAINT "StudentTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSkillStatus" ADD CONSTRAINT "StudentSkillStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
