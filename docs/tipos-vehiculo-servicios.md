# Seleccion de tipo en servicios (modelo actual)

La migracion `21-tipo-vehiculo-en-servicios-mysql51.sql` agrega `servicios.tipo_vehiculo` como ENUM. En el editor de la tabla servicios se puede elegir Camion, Pickup, Panel, Cabezal, Moto, Sedan, Camioneta, Cerrado u Otros. Todos significa que el servicio aplica a cualquier tipo y conserva los servicios generales existentes.

`servicios.tipo` sigue siendo Preventivo/Correctivo. El formulario de ordenes muestra el tipo especifico junto al nombre del servicio y el servidor rechaza nuevas asociaciones con tipos incompatibles. Los detalles ya registrados conservan su tipo aunque cambie la configuracion del servicio.

`detalle_servicio.tipo_vehiculo` guarda el tipo del vehiculo atendido al agregar el servicio. La migracion rellena los detalles anteriores con la instantanea de `ordenes_trabajo.tipo_vehiculo`, sin inferir tipos desde el vehiculo actual. Historial muestra esa instantanea de la orden en la columna Tipo de vehiculo.

La tabla intermedia creada por la migracion 20 queda como estructura anterior conservada, pero ya no define la seleccion ni el filtrado de servicios. La consulta `servicios.list(tipo)` ahora usa directamente `servicios.tipo_vehiculo`. El catalogo `tipos_vehiculo` continua validando los tipos de los vehiculos.

