-- AlterTable Review : réponse publique de la boutique
ALTER TABLE `Review`
    ADD COLUMN `adminReply` TEXT NULL,
    ADD COLUMN `adminReplyAt` DATETIME(3) NULL;

-- AlterTable Quote : réponse du client à la proposition de devis
ALTER TABLE `Quote`
    ADD COLUMN `clientDecision` VARCHAR(191) NULL,
    ADD COLUMN `clientResponse` TEXT NULL,
    ADD COLUMN `clientRespondedAt` DATETIME(3) NULL;
