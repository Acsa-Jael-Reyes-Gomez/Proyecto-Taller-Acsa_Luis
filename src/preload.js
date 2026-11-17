const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('api', {
    whatsapp: { abrir: (telefono, mensaje) => invoke('whatsapp:abrir', telefono, mensaje) },
    recepcion: { list: () => invoke('recepcion:list'), get: id => invoke('recepcion:get', id), create: value => invoke('recepcion:create', value), abrirResumen: id => invoke('recepcion:resumen:open', id),
        fotos: { remove: (id, photoId) => invoke('recepcion:fotos:remove', id, photoId), begin: placa => invoke('recepcion:fotos:begin',placa), discard: id => invoke('recepcion:fotos:discard',id), list: id => invoke('recepcion:fotos:list', id), view: (id, photoId) => invoke('recepcion:fotos:view', id, photoId), upload: id => invoke('recepcion:fotos:upload', id), qr: (id, address) => invoke('recepcion:fotos:qr', id, address), revoke: id => invoke('recepcion:fotos:revoke', id) }
    },
    mecanicos: { remove: id => invoke('mecanicos:delete', id), checkDpi: (dpi, id) => invoke('mecanicos:check-dpi', dpi, id), list: () => invoke('mecanicos:list'), save: (id, value) => invoke('mecanicos:save', id, value) },
    historial: { list: () => invoke('historial:list') },
    dashboard: { get: () => invoke('dashboard:get'), registrarNotificacionMantenimiento: id => invoke('dashboard:notification-sent', id) },
    servicios: { list: (tipoVehiculo) => invoke('servicios:list', tipoVehiculo) },
    auth: {
        login: (usuario, password) => invoke('auth:login', usuario, password),
        logout: () => invoke('auth:logout'),
        onLoggedOut: callback => ipcRenderer.on('auth:logged-out', callback),
        onRoleChanged: callback => ipcRenderer.on('auth:role-changed', (_event, role) => callback(role))
    },
    usuarios: { list: () => invoke('usuarios:list'), setRole: (id, role) => invoke('usuarios:role', id, role) },
    vehiculos: {
        kilometraje: (id, km) => invoke('vehiculos:kilometraje', id, km),
        setEstado: (id, estado) => invoke('vehiculos:estado', id, estado),
        list: () => invoke('vehiculos:list'),
        create: (vehiculo) => invoke('vehiculos:create', vehiculo),
        update: (id, vehiculo) => invoke('vehiculos:update', id, vehiculo),
        remove: (id) => invoke('vehiculos:delete', id)
    },
    pilotos: {
        checkDpi: (dpi, id) => invoke('pilotos:check-dpi', dpi, id),
        list: () => invoke('pilotos:list'),
        create: (piloto) => invoke('pilotos:create', piloto),
        update: (id, piloto) => invoke('pilotos:update', id, piloto),
        remove: (id) => invoke('pilotos:delete', id)
    },
    repuestos: {
        list: () => invoke('repuestos:list'),
        create: (repuesto) => invoke('repuestos:create', repuesto),
        movimiento: (movimiento) => invoke('repuestos:movimiento', movimiento),
        historial: () => invoke('repuestos:historial'),
        ultimosIngresos: () => invoke('repuestos:ultimos-ingresos')
    },
    ordenes: {
        checkIdentidad: (numero, serie, id) => invoke('ordenes:check-identidad', numero, serie, id),
        list: () => invoke('ordenes:list'),
        create: (orden) => invoke('ordenes:create', orden),
        update: (id, orden) => invoke('ordenes:update', id, orden),
        remove: (id) => invoke('ordenes:delete', id)
    }
});
