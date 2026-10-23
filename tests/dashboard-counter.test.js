const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('En taller recupera el contador ausente, excluye entregadas y muestra cero', async () => {
    const nodes = new Map();
    for (const id of ['tablaServiciosInicio', 'dashboardMensaje', 'indicador-vehiculos', 'indicador-proximos', 'indicador-vencidos', 'indicador-enTaller']) nodes.set(id, { textContent: '', replaceChildren() {} });
    let counter;
    let rows = ['Activa', 'En proceso', 'Finalizada', 'Entregado'].map(estado => ({ estado }));
    let calls = 0;
    const ctx = vm.createContext({
        document: { getElementById: id => nodes.get(id) },
        sessionStorage: { getItem: () => '{"id":1,"usuario":"test"}' },
        setInterval() {},
        window: { addEventListener() {}, api: {
            dashboard: { get: async () => ({ vehiculos: 4, proximos: 0, vencidos: 0, servicios: [], enTaller: counter }) },
            ordenes: { list: async () => { calls++; return rows; } }
        } }
    });
    vm.runInContext(fs.readFileSync('src/scripts/dashboard.js', 'utf8'), ctx);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(nodes.get('indicador-enTaller').textContent, 3);
    rows = [{ estado: 'Entregado' }];
    await vm.runInContext('cargarDashboard()', ctx);
    assert.equal(nodes.get('indicador-enTaller').textContent, 0);
    counter = 0;
    const before = calls;
    await vm.runInContext('cargarDashboard()', ctx);
    assert.equal(nodes.get('indicador-enTaller').textContent, 0);
    assert.equal(calls, before);
});
