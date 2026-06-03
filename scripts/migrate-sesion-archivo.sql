ALTER TABLE sesion
  ADD COLUMN archivo_path   VARCHAR(255) NULL AFTER notas_sesion,
  ADD COLUMN archivo_nombre VARCHAR(255) NULL AFTER archivo_path;
