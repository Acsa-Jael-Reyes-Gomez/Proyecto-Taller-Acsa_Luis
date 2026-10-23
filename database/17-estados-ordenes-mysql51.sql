-- Compatibilidad temporal con ordenes anteriores.
ALTER TABLE ordenes_trabajo MODIFY estado ENUM('Abierta', 'Activa', 'En proceso', 'Finalizada', 'Entregado') NOT NULL DEFAULT 'Activa';
UPDATE ordenes_trabajo SET estado = 'Activa' WHERE estado = 'Abierta';
