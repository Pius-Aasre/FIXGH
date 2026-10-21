-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "authorityNotified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "authorityNotifiedAt" TIMESTAMP(3);
