# Usuarios, roles y sesiones

La aplicacion asigna uno de estos roles a cada cuenta activa:

- **Administrador**: puede asignar roles desde el modulo **Usuarios**.
- **Empleado**: usa los modulos operativos; no puede consultar ni cambiar roles.

Si faltan las columnas `rol` o `apellido`, Electron las agrega al iniciar sesion. Si no hay un administrador activo, el primer usuario activo queda como administrador inicial. En esta instalacion hay un solo usuario activo, asi que esa cuenta recibe el rol de Administrador y queda nombrada **Luis Gomez** durante la primera inicializacion. No se puede quitar el rol al ultimo administrador activo.

El boton **Cerrar sesion** aparece en la parte inferior del menu lateral. Cierra la sesion del usuario en las ventanas asociadas, limpia sus borradores de fotos y vuelve a la pantalla de ingreso.

`database/26-roles-usuarios-mysql51.sql` y `database/27-apellido-usuarios-mysql51.sql` contienen las migraciones manuales para despliegues que prefieran aplicar los cambios desde MySQL antes de abrir la aplicacion. Ejecutar cada archivo una sola vez si las columnas correspondientes aun no existen.
