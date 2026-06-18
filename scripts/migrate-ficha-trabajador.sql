-- ============================================================
-- Migración: campos de la "Ficha Trabajador" (tratamiento adicciones)
-- ============================================================

-- I.- Antecedentes personales → datos demográficos del paciente
ALTER TABLE paciente
  ADD COLUMN estado_civil          VARCHAR(50)  NULL AFTER prevision,
  ADD COLUMN numero_hijos          INT          NULL AFTER estado_civil,
  ADD COLUMN escolaridad           VARCHAR(100) NULL AFTER numero_hijos,
  ADD COLUMN profesion_ocupacion   VARCHAR(150) NULL AFTER escolaridad,
  ADD COLUMN comuna                VARCHAR(100) NULL AFTER profesion_ocupacion,
  ADD COLUMN empresa_nombre        VARCHAR(150) NULL AFTER comuna,
  ADD COLUMN apoderado_nombre      VARCHAR(200) NULL AFTER empresa_nombre,
  ADD COLUMN apoderado_parentesco  VARCHAR(100) NULL AFTER apoderado_nombre,
  ADD COLUMN apoderado_edad        INT          NULL AFTER apoderado_parentesco,
  ADD COLUMN apoderado_direccion   VARCHAR(255) NULL AFTER apoderado_edad,
  ADD COLUMN apoderado_telefono    VARCHAR(20)  NULL AFTER apoderado_direccion;

-- Secciones clínicas → ficha_clinica
ALTER TABLE ficha_clinica
  ADD COLUMN enfermedades_mentales    TEXT         NULL,
  ADD COLUMN enfermedades_biologicas  TEXT         NULL,
  ADD COLUMN edad_inicio_consumo      VARCHAR(20)  NULL,
  ADD COLUMN consumo_observaciones    TEXT         NULL,
  ADD COLUMN historial_familiar       TEXT         NULL,
  ADD COLUMN indicacion_intervencion  TEXT         NULL,
  ADD COLUMN modalidad                VARCHAR(100) NULL;

-- II.- Historia de consumo → una fila por sustancia
CREATE TABLE ficha_consumo (
  id_consumo     INT AUTO_INCREMENT PRIMARY KEY,
  id_ficha       INT NOT NULL,
  sustancia      VARCHAR(50) NOT NULL,
  edad_inicio    VARCHAR(20),
  consumo_actual VARCHAR(200),
  CONSTRAINT fk_consumo_ficha FOREIGN KEY (id_ficha) REFERENCES ficha_clinica(id_ficha) ON DELETE CASCADE
);

-- III.- Antecedentes tratamiento → una fila por tratamiento anterior
CREATE TABLE tratamiento_anterior (
  id_tratamiento INT AUTO_INCREMENT PRIMARY KEY,
  id_ficha       INT NOT NULL,
  institucion    VARCHAR(200),
  anio           VARCHAR(10),
  observacion    TEXT,
  CONSTRAINT fk_trat_ficha FOREIGN KEY (id_ficha) REFERENCES ficha_clinica(id_ficha) ON DELETE CASCADE
);
