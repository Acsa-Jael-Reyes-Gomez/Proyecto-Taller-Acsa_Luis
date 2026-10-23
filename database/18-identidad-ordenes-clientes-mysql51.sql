-- Ejecutar una vez. Verificar antes que no existan DPI duplicados.
UPDATE clientes SET dpi = REPLACE(REPLACE(TRIM(dpi), ' ', ''), '-', '') WHERE dpi IS NOT NULL;
ALTER TABLE clientes ADD UNIQUE KEY uq_clientes_dpi (dpi);
UPDATE ordenes_trabajo SET numero = TRIM(numero), serie = UPPER(COALESCE(NULLIF(TRIM(serie), ''), 'SERIE A'));
ALTER TABLE ordenes_trabajo DROP INDEX numero, ADD UNIQUE KEY uq_ordenes_numero_serie (numero, serie);
