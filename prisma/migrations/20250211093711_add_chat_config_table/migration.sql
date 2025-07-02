-- CreateTable
CREATE TABLE "ChatConfig" (
    "id" TEXT NOT NULL,
    "allowFileUpload" BOOLEAN NOT NULL,
    "allowEmojis" BOOLEAN NOT NULL,
    "position" TEXT NOT NULL,
    "iconColor" TEXT NOT NULL,
    "chatWindowColor" TEXT NOT NULL,
    "fontColor" TEXT NOT NULL,
    "availability" BOOLEAN NOT NULL,
    "socketServer" TEXT NOT NULL,

    CONSTRAINT "ChatConfig_pkey" PRIMARY KEY ("id")
);
