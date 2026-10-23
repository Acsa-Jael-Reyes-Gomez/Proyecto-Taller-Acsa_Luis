const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, shell, dialog, nativeImage } = require('electron');
const database = require('./src/database');
const { validarOrden } = require('./src/scripts/orden-validation');

// La identidad de la sesion se conserva en el proceso principal, por ventana.
const usuariosPorVentana = new WeakMap();
let receptionPhotos;
function getReceptionPhotos() {
    if (!receptionPhotos) receptionPhotos = require('./src/reception-photo-service').createReceptionPhotoService({
        database, directory: path.join(app.getPath('userData'), 'recepcion-fotos'),
        normalizeImage: buffer => {
            const image = nativeImage.createFromBuffer(buffer);
            if (image.isEmpty()) throw new Error('Selecciona una imagen JPG, PNG o WEBP valida.');
            const size = image.getSize();
            if (size.width * size.height > 80000000) throw new Error('La foto es demasiado grande.');
            const resized = Math.max(size.width, size.height) > 1920
                ? image.resize(size.width >= size.height ? {width:1920} : {height:1920}) : image;
            return resized.toJPEG(90);
        },
        previewImage: buffer => nativeImage.createFromBuffer(buffer).resize({width:320}).toDataURL()
    });
    return receptionPhotos;
}
function photoUser(event) {
    const id = usuariosPorVentana.get(event.sender);
    if (!id) throw new Error('Inicia sesion para gestionar fotos de recepcion.');
    return id;
}

function registerDatabaseHandlers() {
    ipcMain.handle('recepcion:resumen:open', async (event, id) => {
        const userId = photoUser(event);
        const recepcion = await database.getRecepcion(id);
        const parent = BrowserWindow.fromWebContents(event.sender);
        const win = new BrowserWindow({
            width: 900, height: 760, title: `Resumen de recepción ${recepcion.placa}`,
            parent: parent || undefined, webPreferences: {
                preload: path.join(__dirname, 'src', 'preload.js'), nodeIntegration: false,
                contextIsolation: true, spellcheck: false
            }
        });
        usuariosPorVentana.set(win.webContents, userId);
        win.loadFile('src/views/recepcion-resumen.html', { query: { id: String(recepcion.id_recepcion) } });
        return true;
    });
    const photoTarget = (event,id) => { photoUser(event); if (typeof id === 'string' && id.startsWith('d-')) getReceptionPhotos().authorizeDraft(id,event.sender.id); };
    ipcMain.handle('recepcion:fotos:begin', (event,placa) => {const userId=photoUser(event);return getReceptionPhotos().beginDraft(event.sender.id,userId,placa);});
    ipcMain.handle('recepcion:fotos:discard', (event,id) => { photoTarget(event,id); return getReceptionPhotos().discardDraft(id,event.sender.id); });
    ipcMain.handle('recepcion:fotos:list', (event, id) => { photoTarget(event,id); return getReceptionPhotos().list(id); });
    ipcMain.handle('recepcion:fotos:remove', (event, id, photoId) => { photoTarget(event,id); return getReceptionPhotos().removeDraftPhoto(id,event.sender.id,photoId); });
    ipcMain.handle('recepcion:fotos:view', (event, id, photoId) => { photoTarget(event,id); return getReceptionPhotos().view(id, photoId); });
    ipcMain.handle('recepcion:fotos:qr', (event, id, address) => {
        const userId = photoUser(event);
        return getReceptionPhotos().qr(id, userId, event.sender.id, address);
    });
    ipcMain.handle('recepcion:fotos:revoke', (event, id) => { photoUser(event); getReceptionPhotos().revoke(event.sender.id, id); });
    ipcMain.handle('recepcion:fotos:upload', async (event, id) => {
        const userId = photoUser(event);
        photoTarget(event,id);
        if (typeof id !== 'string' || !id.startsWith('d-')) await database.getRecepcion(id);
        const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
            title: 'Fotos del estado de ingreso', properties: ['openFile', 'multiSelections'],
            filters: [{name:'Fotos', extensions:['jpg','jpeg','png','webp']}]
        });
        if (result.canceled) return {guardadas:0, errores:[]};
        if (photoUser(event) !== userId) throw new Error('La sesion cambio. Selecciona las fotos nuevamente.');
        const fs = require('node:fs/promises');
        const {MAX_BYTES} = require('./src/reception-photo-service');
        let guardadas = 0; const errores = [];
        for (const file of result.filePaths) {
            try {
                if ((await fs.stat(file)).size > MAX_BYTES) throw new Error('La foto supera 10 MB.');
                await getReceptionPhotos().save(id, await fs.readFile(file), path.basename(file), 'Computadora', userId);
                guardadas++;
            } catch (error) { errores.push(`${path.basename(file)}: ${error.message}`); }
        }
        return {guardadas, errores};
    });
    ipcMain.handle('whatsapp:abrir', (event, telefono, mensaje) => {
        if (!usuariosPorVentana.has(event.sender)) throw new Error('Inicia sesion para notificar al cliente.');
        return shell.openExternal(require('./src/whatsapp').construirEnlaceWhatsApp(telefono, mensaje));
    });
    ipcMain.handle('recepcion:list', () => database.listRecepciones());
    ipcMain.handle('recepcion:get', (_event, id) => database.getRecepcion(id));
    ipcMain.handle('recepcion:create', (event, value) => {
        const {photoDraft,fotos,...data}=value;
        if (!photoDraft) return database.createRecepcion(data,usuariosPorVentana.get(event.sender));
        photoTarget(event,photoDraft);
        const pending=getReceptionPhotos().authorizeDraft(photoDraft,event.sender.id);
        if (String(data.idVehiculo) === '' || pending.placa.replace(/[\s-]/g,'').toUpperCase() !== String(data.placaFotos || '').replace(/[\s-]/g,'').toUpperCase()) throw new Error('Las fotos no corresponden a la placa actual.');
        return getReceptionPhotos().commitDraft(photoDraft,event.sender.id,photos=>database.createRecepcion({...data,fotos:photos,fotoPlaca:pending.placa},photoUser(event)));
    });
    ipcMain.handle('mecanicos:delete', (_event, id) => database.deleteMecanico(id));
    ipcMain.handle('mecanicos:check-dpi', (_event, dpi, id) => database.checkMecanicoDpi(dpi, id));
    ipcMain.handle('mecanicos:list', () => database.listMecanicos());
    ipcMain.handle('mecanicos:save', (_event, id, value) => database.saveMecanico(id, value));
    ipcMain.handle('historial:list', () => database.listHistorial());
    ipcMain.handle('dashboard:get', () => database.dashboard());
    ipcMain.handle('servicios:list', (_event, tipoVehiculo) => database.listServicios(tipoVehiculo));
    ipcMain.handle('auth:login', async (event, usuario, password) => {
        receptionPhotos?.revoke(event.sender.id);
        await receptionPhotos?.discardOwner(event.sender.id);
        usuariosPorVentana.delete(event.sender);
        const user = await database.authenticateUser(usuario, password);
        if (user) usuariosPorVentana.set(event.sender, user.id);
        return user;
    });

    ipcMain.handle('vehiculos:estado', (event, id, estado) => {
        if (!usuariosPorVentana.has(event.sender)) throw new Error('Inicia sesion para cambiar el estado.');
        return database.setEstadoVehiculo(id, estado);
    });
    ipcMain.handle('vehiculos:kilometraje', (event, id, km) => {
        if (!usuariosPorVentana.has(event.sender)) throw new Error('Inicia sesion para actualizar el kilometraje.');
        return database.actualizarKilometraje(id, km);
    });
    ipcMain.handle('vehiculos:list', () => database.listVehiculos());
    ipcMain.handle('vehiculos:create', (event, vehiculo) => database.createVehiculo(vehiculo, usuariosPorVentana.get(event.sender)));
    ipcMain.handle('vehiculos:update', (event, id, vehiculo) => database.updateVehiculo(id, vehiculo));
    ipcMain.handle('vehiculos:delete', (event, id) => database.deleteVehiculo(id));

    ipcMain.handle('pilotos:check-dpi', (_event, dpi, id) => database.checkClienteDpi(dpi, id));
    ipcMain.handle('ordenes:check-identidad', (_event, numero, serie, id) => database.checkOrdenIdentidad(numero, serie, id));
    ipcMain.handle('pilotos:list', () => database.listPilotos());
    ipcMain.handle('pilotos:create', (event, piloto) => database.createPiloto(piloto));
    ipcMain.handle('pilotos:update', (event, id, piloto) => database.updatePiloto(id, piloto));
    ipcMain.handle('pilotos:delete', (event, id) => database.deletePiloto(id));

    ipcMain.handle('repuestos:list', () => database.listRepuestos());
    ipcMain.handle('repuestos:create', (event, repuesto) => database.createRepuesto(repuesto));
    ipcMain.handle('repuestos:movimiento', (event, movimiento) => database.createRepuestoMovimiento(movimiento));
    ipcMain.handle('repuestos:historial', () => database.listRepuestoMovimientos());
    ipcMain.handle('repuestos:ultimos-ingresos', () => database.listUltimosIngresosRepuestos());

    ipcMain.handle('ordenes:list', () => database.listOrdenes());
    ipcMain.handle('ordenes:create', (event, orden) => database.createOrden(validarOrden(orden)));
    ipcMain.handle('ordenes:update', (event, id, orden) => database.updateOrden(id, validarOrden(orden)));
    ipcMain.handle('ordenes:delete', (event, id) => database.deleteOrden(id));
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 700,
        title: 'Taller Mecánico',
        webPreferences: {
            preload: path.join(__dirname, 'src', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            spellcheck: false
        }
    });

    win.webContents.on('context-menu', (_event, params) => {
        if (!params.isEditable) return;
        const template = [];
        template.push({ role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' });
        Menu.buildFromTemplate(template).popup({ window: win });
    });
    win.loadFile('src/views/login.html');
    const photoOwner = win.webContents.id;
    win.on('closed', () => { receptionPhotos?.revoke(photoOwner); receptionPhotos?.discardOwner(photoOwner).catch(() => {}); });
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerDatabaseHandlers();

    const actualizarRecordatorios = () => database.generarRecordatorios().catch(error => console.error('No se pudieron generar recordatorios:', error.message));
    actualizarRecordatorios();
    const timer = setInterval(actualizarRecordatorios, 60 * 60 * 1000);
    timer.unref();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    receptionPhotos?.close().catch(error => console.error('No se pudo cerrar el servidor de fotos:', error.message));
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
