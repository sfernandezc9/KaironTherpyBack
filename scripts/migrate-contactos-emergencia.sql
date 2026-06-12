-- Migration: expand paciente contactos de emergencia
-- Adds parentesco + email to contact 1, adds full contact 2 block.
-- Run once on live database.

SET @t = 'paciente';
SET @db = DATABASE();

-- Helper macro: add column if missing
-- contact 1 extras
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME=@t AND COLUMN_NAME='contacto_emergencia_parentesco') = 0,
  'ALTER TABLE paciente ADD COLUMN contacto_emergencia_parentesco VARCHAR(100) AFTER contacto_emergencia_nombre',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME=@t AND COLUMN_NAME='contacto_emergencia_email') = 0,
  'ALTER TABLE paciente ADD COLUMN contacto_emergencia_email VARCHAR(100) AFTER contacto_emergencia_telefono',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- contact 2
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME=@t AND COLUMN_NAME='contacto2_nombre') = 0,
  'ALTER TABLE paciente ADD COLUMN contacto2_nombre VARCHAR(200) AFTER contacto_emergencia_email',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME=@t AND COLUMN_NAME='contacto2_parentesco') = 0,
  'ALTER TABLE paciente ADD COLUMN contacto2_parentesco VARCHAR(100) AFTER contacto2_nombre',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME=@t AND COLUMN_NAME='contacto2_telefono') = 0,
  'ALTER TABLE paciente ADD COLUMN contacto2_telefono VARCHAR(20) AFTER contacto2_parentesco',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME=@t AND COLUMN_NAME='contacto2_email') = 0,
  'ALTER TABLE paciente ADD COLUMN contacto2_email VARCHAR(100) AFTER contacto2_telefono',
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
