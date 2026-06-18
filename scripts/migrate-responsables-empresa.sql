-- Migration: add responsable_empresa table
-- Run once on the live database.

CREATE TABLE IF NOT EXISTS responsable_empresa (
    id_responsable  INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa      INT NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    cargo           VARCHAR(100),
    email           VARCHAR(100),
    celular         VARCHAR(20),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_resp_empresa FOREIGN KEY (id_empresa) REFERENCES empresa(id_empresa) ON DELETE CASCADE
);
