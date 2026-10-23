## Fotos del estado de ingreso

Seleccionar la placa en el formulario actual y usar **Subir fotos** o **QR para celular** antes de guardar. No hay selector de recepciones anteriores. La galeria se actualiza cada cinco segundos y permite ampliar las imagenes. Las fotos permanecen temporales hasta registrar la recepcion y sus im?genes JPEG y metadatos se insertan en la misma transaccion que la ficha y la orden. Si falla el guardado, se conservan para reintentar; limpiar el formulario o cambiar de placa descarta las fotos y desactiva su QR.

El QR abre una pagina local con **Tomar foto**, **Seleccionar fotos de la galeria** y **Enviar fotos al taller**. La opcion de camara depende del celular y su navegador; usa un selector de archivo con `capture="environment"` ([documentacion de HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture)). No usa `getUserMedia`, que exigiria HTTPS para una IP de red local.

Celular y computadora deben estar en la misma red, sin aislamiento entre dispositivos, y la aplicacion debe permanecer abierta. Si Windows solicita acceso de red, permitirlo en la red privada del taller. Cuando hay varias conexiones, el dialogo permite seleccionar la IP correspondiente al Wi-Fi/Ethernet del taller y regenerar el QR. No requiere un servicio externo ni expone las fotos por internet.

Los enlaces tienen un token aleatorio, duran 20 minutos y solo permiten agregar fotos a la recepcion indicada. Generar otro QR para esa recepcion invalida el anterior; cerrar el dialogo o la ventana tambien lo desactiva.

Maximo 20 fotos por recepcion y 10 MB por archivo. Se aceptan JPG, PNG y WEBP, se validan mediante el decodificador de Electron y se convierten a JPEG, con lado mayor de hasta 1920 px. Otros formatos, como HEIC, requieren conversion previa. Las im?genes nuevas se guardan como bytes JPEG en la columna `imagen LONGBLOB` de `recepcion_fotos`, junto con nombre, origen, usuario y fecha. La carpeta local conserva una copia; las consultas prefieren la imagen de la base y recurren al archivo para fotos antiguas.

La tabla y la columna se verifican autom?ticamente al usar la galer?a o guardar fotos. Una tabla existente recibe la columna `imagen LONGBLOB NULL` sin eliminar registros. Las fotos anteriores conservan su archivo local y no se convierten autom?ticamente: su respaldo a?n debe incluir la carpeta `recepcion-fotos` dentro de `app.getPath('userData')`. Para im?genes nuevas basta respaldar tambi?n la tabla. El servidor MySQL debe permitir paquetes del tama?o de las im?genes (l?mite de la aplicaci?n: 10 MB por foto).

Validacion automatizada: `node --test tests/reception-photos.test.js`. Incluye carga por HTTP, QR, asociacion por recepcion, caducidad, revocacion, limites y limpieza de archivos cuando falla el guardado.

La prueba `tests/reception-photos.electron.js` se ejecuta con Electron real y una ventana oculta, utilizando `tests/reception-photos.preload.js` como API simulada. Comprueba decodificacion de imagen, conversion JPEG, galeria, QR y revocacion, sin escribir en la base de datos.
