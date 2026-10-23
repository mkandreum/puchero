-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pantry" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "plan" JSONB,
ADD COLUMN     "reminders" JSONB,
ADD COLUMN     "servings" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shopping" JSONB,
ADD COLUMN     "waterGoal" INTEGER NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "amounts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servings" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WaterLog" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "glasses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "PushSub" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSent" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PushSub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSub_endpoint_key" ON "PushSub"("endpoint");

-- CreateIndex
CREATE INDEX "PushSub_userId_idx" ON "PushSub"("userId");

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSub" ADD CONSTRAINT "PushSub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
