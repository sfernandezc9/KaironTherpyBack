-- Migration: remove telefono/email from sucursal, add responsable_sucursal
-- Run once on the live database.

-- Drop columns from sucursal (idempotent)
SET @col_telefono = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sucursal' AND COLUMN_NAME = 'telefono'
);
SET @col_email = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sucursal' AND COLUMN_NAME = 'email'
);

SET @sql_tel = IF(@col_telefono > 0, 'ALTER TABLE sucursal DROP COLUMN telefono', 'SELECT 1');
SET @sql_eml = IF(@col_email   > 0, 'ALTER TABLE sucursal DROP COLUMN email',    'SELECT 1');

PREPARE stmt FROM @sql_tel; EXECUTE stmt; DEALLOCATE PREPARE stmt;
PREPARE stmt FROM @sql_eml; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create responsable_sucursal if it doesn't exist
CREATE TABLE IF NOT EXISTS responsable_sucursal (
    id_responsable  INT AUTO_INCREMENT PRIMARY KEY,
    id_sucursal     INT NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    cargo           VARCHAR(100),
    email           VARCHAR(100),
    celular         VARCHAR(20),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_resp_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal) ON DELETE CASCADE
);
