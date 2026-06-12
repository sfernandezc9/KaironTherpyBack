-- Migration: create solicitud_insumo table
CREATE TABLE IF NOT EXISTS solicitud_insumo (
    id_solicitud        INT AUTO_INCREMENT PRIMARY KEY,
    id_sucursal         INT NOT NULL,
    id_stock            INT NOT NULL,
    id_terapeuta        INT NOT NULL,
    cantidad            DECIMAL(10,2) NOT NULL,
    estado              ENUM('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
    notas               VARCHAR(255),
    notas_respuesta     VARCHAR(255),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sol_sucursal  FOREIGN KEY (id_sucursal)  REFERENCES sucursal(id_sucursal),
    CONSTRAINT fk_sol_stock     FOREIGN KEY (id_stock)     REFERENCES stock_insumo(id_stock),
    CONSTRAINT fk_sol_terapeuta FOREIGN KEY (id_terapeuta) REFERENCES terapeuta(id_terapeuta)
);
