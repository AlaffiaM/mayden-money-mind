-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "paystackPlanCode" TEXT,
ADD COLUMN     "paystackSubscriptionCode" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "last4" TEXT;
