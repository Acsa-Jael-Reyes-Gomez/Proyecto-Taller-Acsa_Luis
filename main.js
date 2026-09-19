const path = require('path');
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const database = require('./src/database');

function registerDatabaseHandlers() {
    ipcMain.handle('auth:login', (event, usuario, password) => database.authenticateUser(usuario, password));

    ipcMain.handle('vehiculos:list', () => database.listVehiculos());
    ipcMain.handle('vehiculos:create', (event, vehiculo) => database.createVehiculo(vehiculo));
    ipcMain.handle('vehiculos:update', (event, id, vehiculo) => database.updateVehiculo(id, vehiculo));
    ipcMain.handle('vehiculos:delete', (event, id) => database.deleteVehiculo(id));

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
    ipcMain.handle('ordenes:create', (event, orden) => database.createOrden(orden));
    ipcMain.handle('ordenes:update', (event, id, orden) => database.updateOrden(id, orden));
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
            contextIsolation: true
        }
    });

    win.loadFile('src/views/login.html');
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerDatabaseHandlers();

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
