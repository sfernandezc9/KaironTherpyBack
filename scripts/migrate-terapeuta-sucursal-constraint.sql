-- Fix: allow same-day reassignment after deassignment
-- Replaces (id_terapeuta, id_sucursal, fecha_inicio) unique key with
-- a generated-column constraint that only enforces uniqueness on active rows.

ALTER TABLE terapeuta_sucursal
  DROP INDEX uq_terapeuta_sucursal_inicio;

ALTER TABLE terapeuta_sucursal
  ADD COLUMN activo TINYINT GENERATED ALWAYS AS (IF(fecha_fin IS NULL, 1, NULL)) STORED,
  ADD UNIQUE KEY uq_terapeuta_sucursal_activo (id_terapeuta, id_sucursal, activo);
