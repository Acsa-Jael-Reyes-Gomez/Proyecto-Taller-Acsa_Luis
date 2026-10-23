-- Seleccion directa desde la tabla servicios. Todos conserva los servicios generales.
ALTER TABLE servicios ADD COLUMN tipo_vehiculo ENUM('Todos','Camion','Pickup','Panel','Cabezal','Moto','Sedan','Camioneta','Cerrado','Otros') NOT NULL DEFAULT 'Todos' AFTER tipo;
ALTER TABLE detalle_servicio ADD COLUMN tipo_vehiculo VARCHAR(50) NULL AFTER id_servicio;
-- Recuperar solo el tipo conservado en la orden original.
UPDATE detalle_servicio ds JOIN ordenes_trabajo o ON o.id_orden = ds.id_orden SET ds.tipo_vehiculo = o.tipo_vehiculo WHERE ds.tipo_vehiculo IS NULL;
