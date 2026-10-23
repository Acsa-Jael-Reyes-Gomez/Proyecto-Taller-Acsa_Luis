-- Requiere 22-recepcion-orden-espera-mysql51.sql. Se puede ejecutar de nuevo.
START TRANSACTION;
INSERT INTO ordenes_trabajo
    (numero, serie, id_recepcion, id_vehiculo, fecha_entrada, hora_entrada, periodo_entrada,
     vehiculo, placa, piloto, marca, mecanico, id_mecanico, kilometraje, tipo_vehiculo,
     estado, trabajos, observaciones, creado_por, fecha_creacion, fecha_actualizacion)
SELECT CONCAT('REC-', r.id_recepcion), 'RECEPCION', r.id_recepcion, r.id_vehiculo,
    DATE(r.fecha_ingreso), TIME_FORMAT(r.fecha_ingreso, '%h:%i:00'),
    IF(HOUR(r.fecha_ingreso) >= 12, 'PM', 'AM'),
    r.vehiculo, r.placa, r.cliente, v.marca, r.mecanico, r.id_mecanico,
    r.kilometraje, v.tipo, 'Espera', r.motivo,
    IF(r.observaciones = '', 'ninguna observacion', r.observaciones),
    r.creado_por, r.fecha_ingreso, NOW()
FROM recepciones r
JOIN vehiculos v ON v.id_vehiculo = r.id_vehiculo
LEFT JOIN ordenes_trabajo o ON o.id_recepcion = r.id_recepcion
WHERE o.id_orden IS NULL;
INSERT INTO historial_kilometraje
    (id_vehiculo, id_orden, fecha_registro, kilometraje, origen, observaciones)
SELECT r.id_vehiculo, o.id_orden, r.fecha_ingreso, r.kilometraje,
    'Ingreso a taller', CONCAT('Recepcion #', r.id_recepcion)
FROM recepciones r
JOIN ordenes_trabajo o ON o.id_recepcion = r.id_recepcion
LEFT JOIN historial_kilometraje h ON h.id_orden = o.id_orden
WHERE h.id_historial_kilometraje IS NULL;
COMMIT;
