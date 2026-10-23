-- Las recepciones abren ordenes pendientes de completar.
ALTER TABLE ordenes_trabajo MODIFY estado ENUM('Abierta', 'Espera', 'Activa', 'En proceso', 'Finalizada', 'Entregado') NOT NULL DEFAULT 'Activa';
ALTER TABLE ordenes_trabajo ADD COLUMN id_recepcion INT NULL, ADD UNIQUE KEY uq_orden_recepcion (id_recepcion);
