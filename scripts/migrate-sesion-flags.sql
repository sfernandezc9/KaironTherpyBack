ALTER TABLE sesion
  ADD COLUMN consumos_adicciones  TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN ley_karin            TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN psicosocial          TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN prevencion_suicidio  TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN tipo_intervencion    VARCHAR(50)  NULL;
