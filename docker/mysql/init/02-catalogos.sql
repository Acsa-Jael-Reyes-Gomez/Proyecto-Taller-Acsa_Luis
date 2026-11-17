-- Catalogos y ejemplos ficticios. No contiene clientes ni usuarios reales.
INSERT INTO tipos_trabajo (id_tipo_trabajo, nombre) VALUES
(1, 'Mecanico'), (2, 'Enderezado y Pintura'), (3, 'Electrico'), (4, 'Pinchazo');
INSERT INTO tipos_vehiculo (tipo) VALUES
('Camion'), ('Pickup'), ('Panel'), ('Cabezal'), ('Moto'), ('Sedan'), ('Camioneta'), ('Cerrado'), ('Otros');
INSERT INTO servicios (nombre, descripcion, tipo, id_tipo_trabajo, tipo_vehiculo, intervalo_dias_normal, intervalo_km_referencial) VALUES
('Cambio de aceite', 'Ejemplo de mantenimiento preventivo; ajustar al fabricante.', 'Preventivo', 1, 'Todos', 90, 5000),
('Revision de frenos', 'Ejemplo de revision preventiva.', 'Preventivo', 1, 'Todos', 180, 10000),
('Pintura general', 'Preparacion y pintura de carroceria.', 'Correctivo', 2, 'Todos', NULL, NULL),
('Diagnostico electrico', 'Revision del sistema electrico.', 'Correctivo', 3, 'Todos', NULL, NULL),
('Reparacion de pinchazo', 'Reparacion de neumatico.', 'Correctivo', 4, 'Todos', NULL, NULL);
INSERT INTO servicios_tipos_vehiculo (id_servicio, tipo_vehiculo)
SELECT s.id_servicio, t.tipo FROM servicios s CROSS JOIN tipos_vehiculo t;
