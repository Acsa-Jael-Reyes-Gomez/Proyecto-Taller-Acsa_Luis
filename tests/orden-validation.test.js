const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const validation = require('../src/scripts/orden-validation');
const completa = {
    estado: 'Finalizada',
    numero: '505', serie: 'A', fechaEntrada: '2026-09-26', horaEntrada: '08:00', periodoEntrada: 'AM',
    fechaSalida: '2026-09-26', horaSalida: '04:00', periodoSalida: 'PM', placa: 'P-123ABC',
    vehiculo: 'Modelo', piloto: 'Ana', marca: 'Toyota', tipoVehiculo: 'Sedan', proximoServicio: 'Revision',
    trabajos: 'Cambio de aceite', observaciones: 'Sin observaciones', kilometraje: 0, totalManoObra: 0,
    idMecanico: 1, manoMecanico: true, servicios: [1], repuestos: []
};
test('Cada dato de la orden es obligatorio; cero es valido y los repuestos no son obligatorios', () => {
    assert.doesNotThrow(() => validation.validarOrden(completa));
    for (const key of [...Object.keys(validation.campos), 'kilometraje', 'totalManoObra', 'idMecanico']) {
        for (const value of [undefined, null, '', '   ']) {
            assert.throws(() => validation.validarOrden({ ...completa, [key]: value }), undefined, key);
        }
    }
    assert.throws(() => validation.validarOrden({ ...completa, servicios: [] }), /tipo de servicio/);
    assert.throws(() => validation.validarOrden({ ...completa, servicios: [0] }), /tipo de servicio/);
    assert.throws(() => validation.validarOrden({ ...completa, manoMecanico: false }), /tipo de trabajo/);
    assert.throws(() => validation.validarOrden({ ...completa, fechaSalida: '2026-02-30' }), /valida/);
    assert.throws(() => validation.validarOrden({ ...completa, horaSalida: '13:70' }), /valida/);
});

test('Una orden activa se guarda sin fecha ni hora de salida', () => {
    assert.doesNotThrow(() => validation.validarOrden({ ...completa, estado: 'Activa', fechaSalida: '', horaSalida: '', periodoSalida: '' }));
    assert.doesNotThrow(() => validation.validarOrden({ ...completa, estado: 'En proceso', fechaSalida: null, horaSalida: null, periodoSalida: null }));
});

test('Proximo kilometraje menor al ingreso impide guardar, texto de servicio sigue permitido', () => {
    assert.throws(() => validation.validarOrden({...completa, kilometraje:54851, proximoServicio:'54000'}), /menor.*54851/);
    assert.doesNotThrow(() => validation.validarOrden({...completa, kilometraje:54851, proximoServicio:'60000'}));
    assert.doesNotThrow(() => validation.validarOrden({...completa, kilometraje:54851, proximoServicio:'Cambio de aceite en 5,000 km'}));
});
test('Crear y editar por IPC rechazan ordenes incompletas antes de escribir', async () => {
    const handlers = new Map(), writes = [];
    const database = { createOrden: value => writes.push(value), updateOrden: (id, value) => writes.push(value) };
    const electron = { app: { whenReady: () => ({ then() {} }), on() {} }, ipcMain: { handle: (name, fn) => handlers.set(name, fn) } };
    const ctx = vm.createContext({ require: name => name === 'electron' ? electron : name === 'path' ? path : name.endsWith('orden-validation') ? validation : database });
    vm.runInContext(fs.readFileSync('main.js', 'utf8'), ctx);
    vm.runInContext('registerDatabaseHandlers()', ctx);
    assert.throws(() => handlers.get('ordenes:create')({}, { ...completa, servicios: [] }), /tipo de servicio/);
    assert.throws(() => handlers.get('ordenes:update')({}, 1, { ...completa, trabajos: ' ' }), /Detalle de trabajo/);
    assert.equal(writes.length, 0);
    await handlers.get('ordenes:create')({}, completa);
    await handlers.get('ordenes:update')({}, 1, completa);
    assert.equal(writes.length, 2);
});

test('Observaciones permite guardar vacio o con espacios y conserva el texto ingresado', () => {
    for (const observaciones of [undefined, null, '', '   ']) {
        assert.equal(validation.validarOrden({...completa, observaciones}).observaciones, 'ninguna observacion');
    }
    assert.equal(validation.validarOrden({...completa, observaciones: '  Revisar frenos  '}).observaciones, 'Revisar frenos');
});
