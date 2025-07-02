-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip" INTEGER,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "domain" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;
