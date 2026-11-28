-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "zineId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_zineId_idx" ON "favorites"("zineId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_zineId_key" ON "favorites"("userId", "zineId");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_zineId_fkey" FOREIGN KEY ("zineId") REFERENCES "zines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

