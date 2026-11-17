# Base de datos con Docker

Se contiene MySQL en Docker y se ejecuta la interfaz Electron en Windows. Esto cubre la contenerizacion de la base solicitada en la asignacion. La instancia local MySQL 5.1 permanece independiente.

## Requisitos

- Docker Desktop con contenedores Linux y Docker Compose v2, iniciado.
- Node.js 22 o superior y npm para ejecutar Electron y los comandos auxiliares.
- Puerto 3307 disponible (se puede cambiar DB_PORT en .env).

## Instalacion nueva

### Preparar Docker Desktop en Windows

1. Abre PowerShell como administrador y ejecuta `wsl --install --no-distribution`. Si WSL ya esta instalado, ejecuta `wsl --update`. Reinicia Windows si se solicita.
2. Descarga Docker Desktop desde https://docs.docker.com/desktop/setup/install/windows-install/ y selecciona el instalador correspondiente a la arquitectura de tu equipo (x86_64 para Intel/AMD, Arm para Windows ARM).
3. Ejecuta el instalador y selecciona WSL 2 si se ofrece la opcion. Completa la instalacion y abre Docker Desktop.
4. En Settings > General, comprueba que este habilitado Use the WSL 2 based engine. Utiliza contenedores Linux y espera a que el motor este iniciado.
5. Abre una terminal PowerShell nueva y ejecuta `docker version` y `docker compose version`. El primero debe mostrar tanto Client como Server.

Si Docker informa que falta virtualizacion, revisa Administrador de tareas > Rendimiento > CPU > Virtualizacion; debe estar habilitada. Si esta deshabilitada, activala en BIOS/UEFI segun el fabricante.

### Iniciar el proyecto

Desde la raiz del repositorio, en PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run db:up
npm run db:admin
npm run start:docker
```

Antes de iniciar, cambia DB_PASSWORD, MYSQL_ROOT_PASSWORD y ADMIN_PASSWORD en .env. Conserva DB_HOST=127.0.0.1, DB_USER=taller_app y DB_NAME=taller_ttc. Si una clave contiene # o espacios, escribela entre comillas simples. .env esta excluido de Git. No uses el prefijo de ejemplo cambia_esta_clave para una instalacion compartida.

db:up espera la comprobacion de salud. db:admin crea una cuenta nueva de demostracion, sin sobrescribir cuentas existentes. Ingresa con ADMIN_USER y ADMIN_PASSWORD. La aplicacion actual compara directamente password_hash con la clave recibida; este comando conserva ese comportamiento. La migracion a hashes de contrasena requiere un cambio separado antes de uso productivo.

start:docker carga .env solo para ese proceso; npm start conserva la configuracion local habitual. Si src/db-config.js no existe, la aplicacion puede utilizar las variables DB_* sin ese archivo.

## Esquema y datos

docker/mysql/init/01-schema.sql es una instantanea de las 22 tablas y una vista del esquema instalado al implementar Docker. No contiene registros, credenciales, definidores de vistas ni contadores de registros reales. 02-catalogos.sql agrega catalogos y servicios de ejemplo; sus intervalos son ilustrativos.

Estos archivos se ejecutan automaticamente solo en el primer arranque de un volumen vacio. No ejecutar ademas 01-schema.sql de database/ ni la cadena historica de migraciones: representan modelos y etapas distintos. Las migraciones futuras deben aplicarse explicitamente a instalaciones ya creadas y reflejarse tambien en la instantanea para instalaciones nuevas.

El contenedor utiliza MySQL 8.4 con la estructura vigente del sistema y usuario propio con permisos sobre taller_ttc. No importa datos de la instancia 5.1. La compatibilidad de consultas debe verificarse mediante la demostracion funcional en esta version.

## Operacion y evidencias

```powershell
npm run db:status
npm run db:logs
docker compose exec db mysql -u taller_app -p taller_ttc
```

En la consola MySQL:

```sql
SELECT VERSION();
SHOW TABLES;
SELECT usuario, rol FROM usuarios;
SELECT COUNT(*) FROM servicios;
SELECT * FROM vw_mantenimientos_alerta;
```

Para la evidencia academica, captura el estado healthy, la version y tablas, y la aplicacion conectada. Registra un cliente, un vehiculo, una orden y un servicio preventivo; verifica historial y recordatorios. No presentes estas comprobaciones como ejecutadas hasta realizarlas.

```powershell
npm run db:down
npm run db:up
```

down conserva el volumen mysql_data. Los datos deben seguir disponibles al levantarlo otra vez. No uses down -v para detener el entorno: elimina el volumen y sus datos. Cambiar las claves en .env no cambia las de una base ya inicializada; estas se administran dentro de MySQL.

El puerto de MySQL esta publicado solo en 127.0.0.1. Las fotos guardadas por Electron permanecen en su almacenamiento local y requieren respaldo aparte.

## Estado de validacion

Validacion realizada el 16 de noviembre de 2026 con Docker Desktop y MySQL 8.4.13: importacion de 22 tablas y una vista, estado healthy, creacion y autenticacion del administrador, consultas de usuarios, clientes, vehiculos, repuestos, ordenes, mecanicos, historial, servicios y recepciones, dashboard y generacion de recordatorios. Se verifico que el administrador se conserva despues de down/up. Falta la demostracion manual completa de registro y cierre de atenciones desde la interfaz.

Referencias: https://hub.docker.com/_/mysql y https://docs.docker.com/guides/databases/
