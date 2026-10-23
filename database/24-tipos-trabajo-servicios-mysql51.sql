-- MySQL 5.1. Aplicar una vez sobre la base configurada.
-- servicios.tipo sigue indicando Preventivo o Correctivo.
CREATE TABLE tipos_trabajo (
    id_tipo_trabajo INT NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_tipo_trabajo),
    UNIQUE KEY uq_tipos_trabajo_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO tipos_trabajo (id_tipo_trabajo, nombre) VALUES
(1, 'Mecanico'), (2, 'Enderezado y Pintura'), (3, 'Electrico'), (4, 'Pinchazo');

-- Conserva IDs, intervalos y relaciones de los servicios registrados.
ALTER TABLE servicios
    ADD COLUMN id_tipo_trabajo INT NOT NULL DEFAULT 1 AFTER tipo,
    ADD KEY idx_servicios_tipo_trabajo (id_tipo_trabajo),
    ADD CONSTRAINT fk_servicios_tipo_trabajo FOREIGN KEY (id_tipo_trabajo)
        REFERENCES tipos_trabajo(id_tipo_trabajo) ON UPDATE CASCADE ON DELETE RESTRICT;

INSERT INTO servicios (nombre, descripcion, tipo, id_tipo_trabajo, tipo_vehiculo, intervalo_dias_normal, intervalo_km_referencial)
SELECT 'Pintura general', 'Preparacion y pintura general de la carroceria.', 'Correctivo', 2, 'Todos', NULL, NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Pintura general');

INSERT INTO servicios (nombre, descripcion, tipo, id_tipo_trabajo, tipo_vehiculo, intervalo_dias_normal, intervalo_km_referencial)
SELECT 'Diagnostico electrico', 'Revision y diagnostico del sistema electrico.', 'Correctivo', 3, 'Todos', NULL, NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Diagnostico electrico');

INSERT INTO servicios (nombre, descripcion, tipo, id_tipo_trabajo, tipo_vehiculo, intervalo_dias_normal, intervalo_km_referencial)
SELECT 'Reparacion de pinchazo', 'Localizacion y reparacion de pinchazo en neumatico.', 'Correctivo', 4, 'Todos', NULL, NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Reparacion de pinchazo');
