-- MySQL 5.1. Aplicar una vez a la base de datos configurada.
-- Conserva vehiculos.tipo y servicios.tipo con sus significados actuales.
CREATE TABLE tipos_vehiculo (
    tipo VARCHAR(50) NOT NULL,
    PRIMARY KEY (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO tipos_vehiculo (tipo) VALUES
('Camion'), ('Pickup'), ('Panel'), ('Cabezal'), ('Moto'), ('Sedan'),
('Camioneta'), ('Cerrado'), ('Otros');

-- Incluye tambien valores antiguos sin renombrarlos ni borrar vehiculos.
INSERT INTO tipos_vehiculo (tipo)
SELECT DISTINCT v.tipo FROM vehiculos v
LEFT JOIN tipos_vehiculo t ON t.tipo = v.tipo
WHERE v.tipo IS NOT NULL AND t.tipo IS NULL;

CREATE TABLE servicios_tipos_vehiculo (
    id_servicio INT NOT NULL,
    tipo_vehiculo VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_servicio, tipo_vehiculo),
    KEY idx_servicios_tipo_vehiculo (tipo_vehiculo),
    CONSTRAINT fk_servicios_tipos_servicio FOREIGN KEY (id_servicio)
        REFERENCES servicios(id_servicio) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_servicios_tipos_tipo FOREIGN KEY (tipo_vehiculo)
        REFERENCES tipos_vehiculo(tipo) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Mantiene la disponibilidad de todos los servicios actuales.
INSERT INTO servicios_tipos_vehiculo (id_servicio, tipo_vehiculo)
SELECT s.id_servicio, t.tipo FROM servicios s CROSS JOIN tipos_vehiculo t;

ALTER TABLE vehiculos
    ADD CONSTRAINT fk_vehiculos_tipo FOREIGN KEY (tipo)
    REFERENCES tipos_vehiculo(tipo) ON UPDATE CASCADE ON DELETE RESTRICT;
