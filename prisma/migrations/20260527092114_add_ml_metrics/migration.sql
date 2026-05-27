-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "accountPrivacy" TEXT,
ADD COLUMN     "missingFeatures" JSONB,
ADD COLUMN     "platform" TEXT;

-- AlterTable
ALTER TABLE "ProfileResult" ADD COLUMN     "anomalies" JSONB,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "featureContributions" JSONB;
