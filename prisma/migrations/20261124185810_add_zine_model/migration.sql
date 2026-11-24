-- CreateEnum
CREATE TYPE "ZineVisibility" AS ENUM ('private', 'public');

-- CreateTable
CREATE TABLE "zines" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "ZineVisibility" NOT NULL DEFAULT 'private',
    "content" JSONB NOT NULL,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zines_slug_key" ON "zines"("slug");

-- CreateIndex
CREATE INDEX "zines_ownerId_idx" ON "zines"("ownerId");

-- CreateIndex
CREATE INDEX "zines_visibility_updatedAt_idx" ON "zines"("visibility", "updatedAt");

-- AddForeignKey
ALTER TABLE "zines" ADD CONSTRAINT "zines_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
