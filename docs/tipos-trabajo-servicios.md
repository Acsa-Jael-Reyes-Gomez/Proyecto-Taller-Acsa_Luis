Los tipos de trabajo se guardan en `tipos_trabajo`. Cada servicio pertenece a un tipo mediante `servicios.id_tipo_trabajo`, protegido por una clave foranea.

| ID | Tipo de trabajo | Servicios iniciales |
| --- | --- | --- |
| 1 | Mecanico | Cambio de aceite, Revision de frenos, Diagnostico general |
| 2 | Enderezado y Pintura | Pintura general |
| 3 | Electrico | Diagnostico electrico |
| 4 | Pinchazo | Reparacion de pinchazo |

`servicios.tipo` conserva la clasificacion Preventivo/Correctivo y sus reglas de mantenimiento. La API expone `tipoTrabajo` e `idTipoTrabajo` por separado. La orden filtra los servicios por tipo de trabajo y valida la relacion al guardar.

Para otra instalacion, ejecutar `node scripts/migrate-work-types.js --apply` con su configuracion de base de datos. El script aplica `database/24-tipos-trabajo-servicios-mysql51.sql` y guarda una copia previa de la tabla de servicios en `database/backups`. Requiere las migraciones anteriores, incluida la 21.
