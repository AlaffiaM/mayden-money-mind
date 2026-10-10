ALTER TABLE "User"
ADD COLUMN "dailyListeningReminderEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "dailyListeningReminderDate" TEXT;
