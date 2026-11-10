-- AlterTable
ALTER TABLE `ticket` ADD COLUMN `category` ENUM('HARDWARE', 'SOFTWARE', 'RED', 'ACCESOS', 'OTRO') NOT NULL DEFAULT 'OTRO',
    ADD COLUMN `priority` ENUM('BAJA', 'MEDIA', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'MEDIA';

-- CreateIndex
CREATE INDEX `Ticket_priority_idx` ON `Ticket`(`priority`);
