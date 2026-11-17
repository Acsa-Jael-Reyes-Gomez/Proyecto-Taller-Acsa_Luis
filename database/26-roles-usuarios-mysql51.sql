-- Migracion de ejecucion unica para agregar roles en MySQL 5.1.
-- La aplicacion tambien crea esta columna al iniciar sesion si aun no existe.
ALTER TABLE usuarios ADD COLUMN rol ENUM('Administrador', 'Empleado') NOT NULL DEFAULT 'Empleado' AFTER nombre;

-- Designa como administrador inicial al primer usuario activo de la instalacion.
UPDATE usuarios
SET rol = 'Administrador'
WHERE id_usuario = (
    SELECT id_usuario FROM (
        SELECT id_usuario FROM usuarios WHERE estado = 'Activo' ORDER BY id_usuario LIMIT 1
    ) AS primer_usuario
);
