# Recepción

El kilometraje del modulo Vehiculos queda bloqueado si existe alguna orden del vehiculo en Espera, Activa, En proceso o Finalizada (tambien se reconoce el estado antiguo Abierta). Se consulta la relacion con las ordenes, independientemente del estado del catalogo de vehiculos. El bloqueo se aplica tanto al formulario como a la actualizacion de kilometraje por fila y se verifica en la transaccion de base de datos. Las ordenes Entregadas no bloquean; se conserva la validacion que impide reducir el kilometraje.

En los avisos de mantenimiento, **Notificar a cliente** abre WhatsApp en el navegador con el telefono registrado y un mensaje preparado con placa, servicio, estado y referencias de fecha/kilometraje. Debes pulsar Enviar en WhatsApp. Para telefonos locales de ocho digitos se usa el codigo de Guatemala (502); otros telefonos requieren su codigo internacional. No registra el mensaje como enviado: abrir un chat no confirma un envio. El envio directo requeriria integrar WhatsApp Business Platform con una cuenta y numero del taller, credenciales, plantillas y un servidor que gestione los envios.

En las ordenes en Espera, la columna Orden y los campos numero y serie del formulario se muestran vacios. El vinculo interno con Recepcion se conserva; el numero y la serie definitivos se ingresan al completar la orden.

La campana de Recepcion muestra las ordenes en Espera y los vehiculos que alcanzaron o superaron la fecha o el kilometraje de mantenimiento. Incluye placa, servicio, motivo del aviso, cliente y telefono disponible, con accesos al cliente y a la agenda de mantenimiento para coordinar la cita. Son avisos informativos: no envia mensajes ni agenda citas automaticamente. Se actualiza al abrir Recepcion, recuperar el foco, guardar un ingreso y cada minuto. El contador suma ordenes en Espera y vehiculos con mantenimiento pendiente; un vehiculo con varios servicios pendientes se cuenta una vez.

**Agregar nuevo cliente**, en la parte superior de Recepción, abre el formulario existente de Clientes. Guarda temporalmente el borrador del ingreso durante ese recorrido. Al guardar el cliente vuelve a Recepción, restaura el borrador y selecciona el nuevo cliente. Cerrar el formulario de cliente también permite regresar sin perder el borrador. Este retorno se activa únicamente al abrir el registro desde ese botón; el módulo Clientes conserva su comportamiento habitual cuando se abre desde el menú.

El módulo recibe vehículos ya registrados. Selecciona el vehículo y un cliente registrado, confirma el kilometraje y perfil de uso, elige un mecánico si corresponde y completa el motivo, combustible y checklist de custodia. El cliente vinculado se selecciona automáticamente; al guardar se actualiza la relación del vehículo con el cliente elegido.

Al guardar, la ficha, una orden de trabajo en **Espera**, el historial de kilometraje y el cambio del vehículo a **En taller** se realizan en una sola transacción. La orden tiene numero `REC-<id de recepcion>`, serie `RECEPCION` y vinculo unico al ingreso. No permite recibir dos veces un vehículo que todavía está en taller ni reducir su kilometraje. La ficha conserva los nombres y datos del ingreso para su consulta posterior, aunque cambien los registros originales.

Las ordenes en Espera aparecen en Ordenes de Trabajo y pueden filtrarse por **En espera**. La accion **Completar orden** abre la edicion para asignar los datos de trabajo y servicios con las validaciones habituales; guardar esa edicion activa la orden. La apertura desde Recepcion no asigna servicios, cobra repuestos ni registra una salida. Usa **Cambiar placa** para limpiar la busqueda y recibir otro vehiculo disponible.

Para instalar en otra base de datos, ejecuta primero `database/22-recepcion-orden-espera-mysql51.sql`. Agrega el estado Espera y la relacion unica de la orden con su recepcion.

Si existen recepciones guardadas antes de habilitar la apertura automatica, ejecuta `database/23-ordenes-recepciones-pendientes-mysql51.sql`: crea las ordenes faltantes en Espera y su historial de kilometraje, conservando la fecha original del ingreso. La migracion se puede ejecutar nuevamente sin duplicar ordenes vinculadas. Los indicadores de ordenes cuentan los estados actuales de las ordenes creadas en el mes seleccionado; Espera y Entregado no se suman a Activas, En proceso ni Finalizadas.

El historial de ingresos se conserva en la tabla `recepciones` de MySQL. El formulario de Recepcion no muestra una tabla de historial. Las ordenes de trabajo siguen registrandose en su modulo.

Pulsa **Guardar** para registrar el ingreso en el historial MySQL. Tras guardarlo aparece **Generar documento**, que consulta la ficha persistida y abre una vista imprimible con la constancia de conformidad y espacios para las firmas del cliente y de quien recibe. Pulsa **Imprimir** para abrir el diálogo de impresión. El historial de recepciones también permite volver a generar documentos de ingresos anteriores. La firma se realiza sobre el documento impreso.

La tabla `recepciones` se crea automáticamente al abrir el módulo, compatible con MySQL 5.1. El usuario configurado de MySQL necesita permiso `CREATE` para esa primera apertura y permisos de consulta/escritura para usar el módulo. Reinicia Electron tras actualizar el código para cargar los nuevos canales IPC.

Validación automatizada: `node --test tests/*.test.js`. Las pruebas de recepción simulan la conexión para verificar validación, transacciones, reversión y orden del menú; no sustituyen una prueba con la base de datos del taller.
