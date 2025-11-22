### Create table `support_tickets` and `support_messages` 

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `userEmail` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL,
  `status` enum('open','closed','resolved') NOT NULL DEFAULT 'open',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticketId` int(11) NOT NULL,
  `senderId` varchar(255) NOT NULL,
  `senderName` varchar(255) NOT NULL,
  `text` text NOT NULL,
  `isAdminReply` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ticketId` (`ticketId`),
  CONSTRAINT `fk_ticket_message` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;