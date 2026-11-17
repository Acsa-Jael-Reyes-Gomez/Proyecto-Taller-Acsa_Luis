const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, dialog, nativeImage } = require('electron');
const database = require('./src/database');
const { validarOrden } = require('./src/scripts/orden-validation');

// La identidad de la sesion se conserva en el proceso principal, por ventana.
const usuariosPorVentana = new WeakMap();
const rolesPorVentana = new WeakMap();
const ventanasPorUsuario = new Map();
let receptionPhotos;
let whatsAppWindow;
async function abrirVentanaWhatsApp(url) {
    if (!whatsAppWindow || whatsAppWindow.isDestroyed()) {
        const ventana = new BrowserWindow({
            width: 1080, height: 800, minWidth: 720, minHeight: 560,
            title: 'WhatsApp', autoHideMenuBar: true, show: false,
            webPreferences: {
                partition: 'persist:whatsapp-web',
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true
            }
        });
        whatsAppWindow = ventana;
        const versionChrome = process.versions.chrome || '120.0.0.0';
        ventana.webContents.setUserAgent(
            `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${versionChrome} Safari/537.36`,
            'es-419,es,en-US,en'
        );
        ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        ventana.on('closed', () => { if (whatsAppWindow === ventana) whatsAppWindow = null; });
    }
    const ventana = whatsAppWindow;
    const enlace = new URL(url);
    const numero = enlace.pathname.replace(/^\/+/, '');
    const chat = new URL('https://web.whatsapp.com/send');
    chat.searchParams.set('phone', numero);
    chat.searchParams.set('text', enlace.searchParams.get('text') || '');
    if (ventana.isMinimized()) ventana.restore();
    const carga = ventana.loadURL(chat.toString());
    carga.catch(error => console.error('No se pudo cargar WhatsApp Web:', error.message));
    ventana.show();
    ventana.focus();
    return true;
}
function exifOrientation(buffer) {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return 1;
    let offset = 2;
    while (offset + 4 < buffer.length && buffer[offset] === 0xff) {
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (marker === 0xda || marker === 0xd9 || length < 2) break;
        if (marker === 0xe1 && buffer.toString('ascii', offset + 4, offset + 10) === 'Exif\0\0') {
            const tiff = offset + 10;
            const little = buffer.toString('ascii', tiff, tiff + 2) === 'II';
            const u16 = at => little ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at);
            const u32 = at => little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at);
            if (u16(tiff + 2) !== 42) return 1;
            const ifd = tiff + u32(tiff + 4);
            const count = u16(ifd);
            for (let i = 0; i < count; i++) {
                const entry = ifd + 2 + i * 12;
                if (u16(entry) === 0x0112 && u16(entry + 2) === 3) return u16(entry + 8);
            }
            return 1;
        }
        offset += 2 + length;
    }
    return 1;
}
function orientNativeImage(image, orientation) {
    if (orientation < 2 || orientation > 8) return image;
    const { width, height } = image.getSize();
    const source = image.toBitmap();
    const swapsAxes = orientation >= 5;
    const targetWidth = swapsAxes ? height : width;
    const targetHeight = swapsAxes ? width : height;
    const target = Buffer.allocUnsafe(source.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        let dx, dy;
        switch (orientation) {
            case 2: dx = width - 1 - x; dy = y; break;
            case 3: dx = width - 1 - x; dy = height - 1 - y; break;
            case 4: dx = x; dy = height - 1 - y; break;
            case 5: dx = y; dy = x; break;
            case 6: dx = height - 1 - y; dy = x; break;
            case 7: dx = height - 1 - y; dy = width - 1 - x; break;
            default: dx = y; dy = width - 1 - x;
        }
        const from = (y * width + x) * 4;
        const to = (dy * targetWidth + dx) * 4;
        source.copy(target, to, from, from + 4);
    }
    return nativeImage.createFromBitmap(target, { width: targetWidth, height: targetHeight });
}
function asociarSesion(webContents, user) {
    quitarSesion(webContents);
    usuariosPorVentana.set(webContents, user.id);
    rolesPorVentana.set(webContents, user.rol);
    if (!ventanasPorUsuario.has(user.id)) ventanasPorUsuario.set(user.id, new Set());
    ventanasPorUsuario.get(user.id).add(webContents);
}
function quitarSesion(webContents) {
    const userId = usuariosPorVentana.get(webContents);
    if (userId == null) return;
    const ventanas = ventanasPorUsuario.get(userId);
    ventanas?.delete(webContents);
    if (ventanas?.size === 0) ventanasPorUsuario.delete(userId);
    usuariosPorVentana.delete(webContents);
    rolesPorVentana.delete(webContents);
}
function cerrarSesionUsuario(userId) {
    const ventanas = ventanasPorUsuario.get(userId);
    if (!ventanas) return;
    for (const webContents of ventanas) {
        usuariosPorVentana.delete(webContents);
        rolesPorVentana.delete(webContents);
        if (!webContents.isDestroyed()) webContents.send('auth:logged-out');
    }
    ventanasPorUsuario.delete(userId);
}
function getReceptionPhotos() {
    if (!receptionPhotos) receptionPhotos = require('./src/reception-photo-service').createReceptionPhotoService({
        database, directory: path.join(app.getPath('userData'), 'recepcion-fotos'),
        normalizeImage: buffer => {
            const image = orientNativeImage(nativeImage.createFromBuffer(buffer), exifOrientation(buffer));
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
function requireAdministrator(event) {
    photoUser(event);
    if (rolesPorVentana.get(event.sender) !== 'Administrador') throw new Error('Esta accion requiere el rol de Administrador.');
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
        const webContents = win.webContents;
        asociarSesion(webContents, { id: userId, rol: rolesPorVentana.get(event.sender) });
        win.on('closed', () => quitarSesion(webContents));
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
        return abrirVentanaWhatsApp(require('./src/whatsapp').construirEnlaceWhatsApp(telefono, mensaje));
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
    ipcMain.handle('dashboard:notification-sent', (event, id) => {
        if (!usuariosPorVentana.has(event.sender)) throw new Error('Inicia sesion para registrar el recordatorio.');
        return database.registrarNotificacionMantenimiento(id);
    });
    ipcMain.handle('servicios:list', (_event, tipoVehiculo) => database.listServicios(tipoVehiculo));
    ipcMain.handle('auth:login', async (event, usuario, password) => {
        receptionPhotos?.revoke(event.sender.id);
        await receptionPhotos?.discardOwner(event.sender.id);
        quitarSesion(event.sender);
        const user = await database.authenticateUser(usuario, password);
        if (user) asociarSesion(event.sender, user);
        return user;
    });
    ipcMain.handle('auth:logout', async event => {
        const userId = usuariosPorVentana.get(event.sender);
        const sesiones = userId == null ? [event.sender] : [...(ventanasPorUsuario.get(userId) || [event.sender])];
        for (const webContents of sesiones) receptionPhotos?.revoke(webContents.id);
        try { await Promise.all(sesiones.map(webContents => receptionPhotos?.discardOwner(webContents.id))); }
        finally { if (userId != null) cerrarSesionUsuario(userId); else quitarSesion(event.sender); }
        return true;
    });
    ipcMain.handle('usuarios:list', event => { requireAdministrator(event); return database.listUsers(); });
    ipcMain.handle('usuarios:role', async (event, id, role) => {
        requireAdministrator(event);
        const updated = await database.setUserRole(id, role);
        const sessions = ventanasPorUsuario.get(updated.id);
        for (const webContents of sessions || []) {
            rolesPorVentana.set(webContents, updated.rol);
            if (!webContents.isDestroyed()) webContents.send('auth:role-changed', updated.rol);
        }
        return updated;
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
    const webContents = win.webContents;
    const photoOwner = webContents.id;
    win.on('closed', () => { quitarSesion(webContents); receptionPhotos?.revoke(photoOwner); receptionPhotos?.discardOwner(photoOwner).catch(() => {}); });
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
