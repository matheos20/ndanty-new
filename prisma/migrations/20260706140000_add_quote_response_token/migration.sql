-- AlterTable Quote : jeton unique pour la réponse au devis via un lien email
ALTER TABLE `Quote` ADD COLUMN `responseToken` VARCHAR(191) NULL;

-- Index unique (plusieurs NULL autorisés en MySQL)
CREATE UNIQUE INDEX `Quote_responseToken_key` ON `Quote`(`responseToken`);
