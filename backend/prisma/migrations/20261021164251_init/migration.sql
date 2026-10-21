-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CITIZEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageUploadFailed" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "aiPriorityScore" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationText" TEXT,
    "confidence" DOUBLE PRECISION,
    "filterStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "filterReason" TEXT,
    "assignedAuthorityId" TEXT,
    "assignedAuthorityName" TEXT,
    "assignedAuthorityEmail" TEXT,
    "monthlyDigestSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authority" (
    "id" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "category" TEXT,
    "reportTypes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyDigestLog" (
    "id" TEXT NOT NULL,
    "targetMonth" TEXT NOT NULL,
    "runTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "totalAuthorities" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MonthlyDigestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_filterStatus_idx" ON "Report"("filterStatus");

-- CreateIndex
CREATE INDEX "Report_assignedAuthorityEmail_idx" ON "Report"("assignedAuthorityEmail");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Authority_emailAddress_key" ON "Authority"("emailAddress");

-- CreateIndex
CREATE INDEX "MonthlyDigestLog_targetMonth_idx" ON "MonthlyDigestLog"("targetMonth");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
