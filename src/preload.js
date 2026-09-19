const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('api', {
    auth: {
        login: (usuario, password) => invoke('auth:login', usuario, password)
    },
    vehiculos: {
        list: () => invoke('vehiculos:list'),
        create: (vehiculo) => invoke('vehiculos:create', vehiculo),
        update: (id, vehiculo) => invoke('vehiculos:update', id, vehiculo),
        remove: (id) => invoke('vehiculos:delete', id)
    },
    pilotos: {
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
        list: () => invoke('ordenes:list'),
        create: (orden) => invoke('ordenes:create', orden),
        update: (id, orden) => invoke('ordenes:update', id, orden),
        remove: (id) => invoke('ordenes:delete', id)
    }
});
