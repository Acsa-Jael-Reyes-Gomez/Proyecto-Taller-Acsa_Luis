-- Migracion de ejecucion unica. La aplicacion agrega estas columnas al autenticar si faltan.
ALTER TABLE usuarios ADD COLUMN apellido VARCHAR(100) NOT NULL DEFAULT '' AFTER nombre;

-- Esta instalacion tiene un solo usuario activo, que es la cuenta administradora.
UPDATE usuarios
SET nombre = 'Luis', apellido = 'Gomez'
WHERE id_usuario = (
    SELECT id_usuario FROM (
        SELECT id_usuario FROM usuarios WHERE estado = 'Activo' AND rol = 'Administrador' ORDER BY id_usuario LIMIT 1
    ) AS administrador_actual
);
