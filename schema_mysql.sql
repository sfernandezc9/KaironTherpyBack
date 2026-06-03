-- ============================================================
-- MODELO SQL - SISTEMA DE GESTIÓN CLÍNICA (MySQL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS kairon_therapy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kairon_therapy;

-- ============================================================
-- 1. EMPRESA
-- ============================================================
CREATE TABLE empresa (
    id_empresa      INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    rut             VARCHAR(20)  UNIQUE NOT NULL,
    direccion       VARCHAR(255),
    telefono        VARCHAR(20),
    email           VARCHAR(100),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. SUCURSAL
-- ============================================================
CREATE TABLE sucursal (
    id_sucursal     INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa      INT NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    direccion       VARCHAR(255),
    telefono        VARCHAR(20),
    email           VARCHAR(100),
    activa          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sucursal_empresa FOREIGN KEY (id_empresa) REFERENCES empresa(id_empresa) ON DELETE CASCADE
);

-- ============================================================
-- 3. PERSONA
-- ============================================================
CREATE TABLE persona (
    id_persona      INT AUTO_INCREMENT PRIMARY KEY,
    rut             VARCHAR(20)  UNIQUE NOT NULL,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero          VARCHAR(20),
    telefono        VARCHAR(20),
    email           VARCHAR(100),
    direccion       VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. PACIENTE
-- ============================================================
CREATE TABLE paciente (
    id_paciente     INT AUTO_INCREMENT PRIMARY KEY,
    id_persona      INT NOT NULL UNIQUE,
    id_sucursal     INT NOT NULL,
    prevision       VARCHAR(100),
    contacto_emergencia_nombre  VARCHAR(200),
    contacto_emergencia_telefono VARCHAR(20),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_paciente_persona  FOREIGN KEY (id_persona)  REFERENCES persona(id_persona) ON DELETE CASCADE,
    CONSTRAINT fk_paciente_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal)
);

-- ============================================================
-- 5. TERAPEUTA
-- ============================================================
CREATE TABLE terapeuta (
    id_terapeuta    INT AUTO_INCREMENT PRIMARY KEY,
    id_persona      INT NOT NULL UNIQUE,
    especialidad    VARCHAR(150),
    registro_profesional VARCHAR(50),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_terapeuta_persona FOREIGN KEY (id_persona) REFERENCES persona(id_persona) ON DELETE CASCADE
);

-- ============================================================
-- 6. TERAPEUTA_SUCURSAL
-- ============================================================
CREATE TABLE terapeuta_sucursal (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_terapeuta    INT NOT NULL,
    id_sucursal     INT NOT NULL,
    fecha_inicio    DATE NOT NULL DEFAULT (CURRENT_DATE),
    fecha_fin       DATE,
    activo          TINYINT GENERATED ALWAYS AS (IF(fecha_fin IS NULL, 1, NULL)) STORED,
    UNIQUE KEY uq_terapeuta_sucursal_activo (id_terapeuta, id_sucursal, activo),
    CONSTRAINT fk_ts_terapeuta FOREIGN KEY (id_terapeuta) REFERENCES terapeuta(id_terapeuta) ON DELETE CASCADE,
    CONSTRAINT fk_ts_sucursal  FOREIGN KEY (id_sucursal)  REFERENCES sucursal(id_sucursal)  ON DELETE CASCADE
);

-- ============================================================
-- 7. INSUMO
-- ============================================================
CREATE TABLE insumo (
    id_insumo       INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    unidad_medida   VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. STOCK_INSUMO
-- ============================================================
CREATE TABLE stock_insumo (
    id_stock        INT AUTO_INCREMENT PRIMARY KEY,
    id_sucursal     INT NOT NULL,
    id_insumo       INT NOT NULL,
    cantidad        DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    cantidad_minima DECIMAL(10, 2) DEFAULT 0,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_stock_sucursal_insumo (id_sucursal, id_insumo),
    CONSTRAINT fk_stock_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal) ON DELETE CASCADE,
    CONSTRAINT fk_stock_insumo   FOREIGN KEY (id_insumo)   REFERENCES insumo(id_insumo)   ON DELETE CASCADE
);

-- ============================================================
-- 9. FICHA CLÍNICA
-- ============================================================
CREATE TABLE ficha_clinica (
    id_ficha        INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente     INT NOT NULL UNIQUE,
    motivo_consulta TEXT,
    antecedentes    TEXT,
    alergias        TEXT,
    medicamentos    TEXT,
    diagnostico_actual TEXT,
    observaciones   TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ficha_paciente FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE
);

-- ============================================================
-- 10. SESIÓN
-- ============================================================
CREATE TABLE sesion (
    id_sesion       INT AUTO_INCREMENT PRIMARY KEY,
    id_ficha        INT NOT NULL,
    id_terapeuta    INT NOT NULL,
    id_sucursal     INT NOT NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duracion_minutos INT,
    estado          VARCHAR(30) DEFAULT 'realizada',
    notas_sesion    TEXT,
    archivo_path    VARCHAR(255),
    archivo_nombre  VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sesion_ficha      FOREIGN KEY (id_ficha)     REFERENCES ficha_clinica(id_ficha) ON DELETE CASCADE,
    CONSTRAINT fk_sesion_terapeuta  FOREIGN KEY (id_terapeuta) REFERENCES terapeuta(id_terapeuta),
    CONSTRAINT fk_sesion_sucursal   FOREIGN KEY (id_sucursal)  REFERENCES sucursal(id_sucursal)
);

-- ============================================================
-- 11. HISTORIAL DE ATENCIÓN
-- ============================================================
CREATE TABLE historial_atencion (
    id_historial    INT AUTO_INCREMENT PRIMARY KEY,
    id_ficha        INT NOT NULL,
    id_sesion       INT,
    id_terapeuta    INT NOT NULL,
    campo_modificado VARCHAR(100) NOT NULL,
    valor_anterior  TEXT,
    valor_nuevo     TEXT,
    fecha_cambio    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hist_ficha     FOREIGN KEY (id_ficha)     REFERENCES ficha_clinica(id_ficha) ON DELETE CASCADE,
    CONSTRAINT fk_hist_sesion    FOREIGN KEY (id_sesion)    REFERENCES sesion(id_sesion),
    CONSTRAINT fk_hist_terapeuta FOREIGN KEY (id_terapeuta) REFERENCES terapeuta(id_terapeuta)
);

-- ============================================================
-- 12. SESION_INSUMO
-- ============================================================
CREATE TABLE sesion_insumo (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_sesion       INT NOT NULL,
    id_stock        INT NOT NULL,
    cantidad_usada  DECIMAL(10, 2) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_si_sesion FOREIGN KEY (id_sesion) REFERENCES sesion(id_sesion) ON DELETE CASCADE,
    CONSTRAINT fk_si_stock  FOREIGN KEY (id_stock)  REFERENCES stock_insumo(id_stock)
);

-- ============================================================
-- 13. INFORME
-- ============================================================
CREATE TABLE informe (
    id_informe      INT AUTO_INCREMENT PRIMARY KEY,
    titulo          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(50) NOT NULL,
    id_empresa      INT,
    id_sucursal     INT,
    id_paciente     INT,
    id_terapeuta    INT,
    id_insumo       INT,
    fecha_desde     DATE,
    fecha_hasta     DATE,
    contenido       TEXT,
    url_documento   VARCHAR(500),
    generado_por    INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inf_empresa   FOREIGN KEY (id_empresa)   REFERENCES empresa(id_empresa),
    CONSTRAINT fk_inf_sucursal  FOREIGN KEY (id_sucursal)  REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_inf_paciente  FOREIGN KEY (id_paciente)  REFERENCES paciente(id_paciente),
    CONSTRAINT fk_inf_terapeuta FOREIGN KEY (id_terapeuta) REFERENCES terapeuta(id_terapeuta),
    CONSTRAINT fk_inf_insumo    FOREIGN KEY (id_insumo)    REFERENCES insumo(id_insumo),
    CONSTRAINT fk_inf_generado  FOREIGN KEY (generado_por) REFERENCES persona(id_persona)
);

-- ============================================================
-- 14. USUARIO (autenticación)
-- ============================================================
CREATE TABLE usuario (
    id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
    id_persona      INT NOT NULL UNIQUE,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    rol             ENUM('administrador','terapeuta') NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    ultimo_login    TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_persona FOREIGN KEY (id_persona) REFERENCES persona(id_persona) ON DELETE CASCADE
);

-- ============================================================
-- 15. STOCK_PROVEEDOR
-- ============================================================
CREATE TABLE stock_proveedor (
    id_stock_proveedor  INT AUTO_INCREMENT PRIMARY KEY,
    id_insumo           INT NOT NULL UNIQUE,
    cantidad            DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cantidad_minima     DECIMAL(10, 2) DEFAULT 0,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sp_insumo FOREIGN KEY (id_insumo) REFERENCES insumo(id_insumo) ON DELETE CASCADE
);

-- ============================================================
-- 16. TRANSFERENCIA_STOCK
-- ============================================================
CREATE TABLE transferencia_stock (
    id_transferencia    INT AUTO_INCREMENT PRIMARY KEY,
    id_stock_proveedor  INT NOT NULL,
    id_stock            INT NOT NULL,
    cantidad            DECIMAL(10, 2) NOT NULL,
    id_usuario          INT NOT NULL,
    notas               VARCHAR(255),
    fecha               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ts_proveedor FOREIGN KEY (id_stock_proveedor) REFERENCES stock_proveedor(id_stock_proveedor),
    CONSTRAINT fk_ts_stock     FOREIGN KEY (id_stock)           REFERENCES stock_insumo(id_stock),
    CONSTRAINT fk_ts_usuario   FOREIGN KEY (id_usuario)         REFERENCES usuario(id_usuario)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_sesion_ficha       ON sesion(id_ficha);
CREATE INDEX idx_sesion_terapeuta   ON sesion(id_terapeuta);
CREATE INDEX idx_sesion_sucursal    ON sesion(id_sucursal);
CREATE INDEX idx_historial_ficha    ON historial_atencion(id_ficha);
CREATE INDEX idx_historial_sesion   ON historial_atencion(id_sesion);
CREATE INDEX idx_stock_sucursal     ON stock_insumo(id_sucursal);
CREATE INDEX idx_terapeuta_sucursal ON terapeuta_sucursal(id_terapeuta, id_sucursal);
