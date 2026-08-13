-- AlterTable : ajout des champs de proposition de devis (prix + réponse admin)
ALTER TABLE `Quote`
    ADD COLUMN `proposedPrice` DOUBLE NULL,
    ADD COLUMN `adminResponse` TEXT NULL,
    ADD COLUMN `proposedAt` DATETIME(3) NULL;
