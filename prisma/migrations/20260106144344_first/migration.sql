-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "emailVerified" TIMESTAMP(3),
    "googleId" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'credentials',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionId" TEXT,
    "customerId" TEXT,
    "subscriptionEndsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "lastSubscriptionSync" TIMESTAMP(3),
    "aiGenerationsTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDatetime" TIMESTAMP(3) NOT NULL,
    "city" TEXT,
    "nation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "rodensRating" TEXT,
    "tags" TEXT,
    "notes" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT DEFAULT 'classic',
    "date_format" TEXT DEFAULT 'EU',
    "time_format" TEXT DEFAULT '24h',
    "show_aspect_icons" BOOLEAN DEFAULT true,
    "show_degree_indicators" BOOLEAN DEFAULT true,
    "distribution_method" TEXT DEFAULT 'weighted',
    "default_zodiac_system" TEXT DEFAULT 'Tropical',
    "default_sidereal_mode" TEXT,
    "house_system" TEXT DEFAULT 'Placidus',
    "perspective_type" TEXT DEFAULT 'Geocentric',
    "rulership_mode" TEXT DEFAULT 'modern',
    "active_points" TEXT,
    "active_aspects" TEXT,
    "custom_distribution_weights" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedChart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "chartData" TEXT NOT NULL,
    "settings" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedInterpretation" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedInterpretation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_customerId_idx" ON "User"("customerId");

-- CreateIndex
CREATE INDEX "Subject_ownerId_idx" ON "Subject"("ownerId");

-- CreateIndex
CREATE INDEX "Subject_name_idx" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChartPreferences_userId_key" ON "ChartPreferences"("userId");

-- CreateIndex
CREATE INDEX "ChartPreferences_userId_idx" ON "ChartPreferences"("userId");

-- CreateIndex
CREATE INDEX "SavedChart_userId_idx" ON "SavedChart"("userId");

-- CreateIndex
CREATE INDEX "SavedChart_type_idx" ON "SavedChart"("type");

-- CreateIndex
CREATE INDEX "CachedInterpretation_userId_idx" ON "CachedInterpretation"("userId");

-- CreateIndex
CREATE INDEX "CachedInterpretation_hash_idx" ON "CachedInterpretation"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "CachedInterpretation_hash_userId_key" ON "CachedInterpretation"("hash", "userId");

-- CreateIndex
CREATE INDEX "UserAIUsage_userId_idx" ON "UserAIUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAIUsage_userId_date_key" ON "UserAIUsage"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_type_idx" ON "VerificationToken"("userId", "type");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartPreferences" ADD CONSTRAINT "ChartPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedChart" ADD CONSTRAINT "SavedChart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
