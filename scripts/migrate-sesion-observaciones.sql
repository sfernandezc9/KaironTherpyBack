ALTER TABLE sesion
  ADD COLUMN observaciones        TEXT NULL AFTER notas_sesion,
  ADD COLUMN tipo_observacion     ENUM('avance', 'retroceso') NULL AFTER observaciones,
  ADD COLUMN nuevas_indicaciones  TEXT NULL AFTER tipo_observacion;
