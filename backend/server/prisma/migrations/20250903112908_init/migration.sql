-- CreateEnum
CREATE TYPE "public"."TradeType" AS ENUM ('BUY', 'SELL', 'LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "balance" JSONB NOT NULL DEFAULT '{"usd": {"tradable": 5000.0, "locked": 0.0}}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "type" "public"."TradeType" NOT NULL,
    "status" "public"."Status" NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "leverage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Holding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_asset_key" ON "public"."Holding"("userId", "asset");

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
