const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRules } = require('../src/maintenance-rules');
function setup(blocked) {
    const writes = [];
    const connection = {
        beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
        execute: async (sql, params) => {
            if (sql.startsWith('SELECT * FROM vehiculos') || sql.startsWith('SELECT v.*')) return [[{id_vehiculo:1,placa:'P-1',kilometraje:100}]];
            if (sql.includes('SELECT id_orden FROM ordenes_trabajo')) {
                assert(sql.includes("'Espera', 'Activa', 'Abierta', 'En proceso', 'Finalizada'"));
                return [blocked ? [{id_orden:7}] : []];
            }
            if (sql.startsWith('SELECT MAX')) return [[{ultimo:100}]];
            writes.push({sql,params}); return [{}];
        }
    };
    return {rules:createRules({getConnection:async()=>connection}),writes};
}
test('Vehiculos bloquea kilometraje con orden pendiente y no escribe', async () => {
    const {rules,writes}=setup(true);
    await assert.rejects(rules.actualizarKilometraje(1,110),/No puedes modificar/);
    assert.equal(writes.length,0);
});
test('Vehiculos permite kilometraje sin orden pendiente y conserva validacion del odometro', async () => {
    const {rules,writes}=setup(false);
    assert.deepEqual(await rules.actualizarKilometraje(1,110),{id:1,kilometraje:110});
    assert(writes.some(w=>w.sql.includes('INSERT INTO historial_kilometraje')));
    await assert.rejects(rules.actualizarKilometraje(1,99),/menor/);
});
test('La edicion completa de Vehiculos tampoco puede cambiar el kilometraje bloqueado', async () => {
    const {rules,writes}=setup(true);
    let saved=false;
    await assert.rejects(rules.guardarVehiculo(1,{kilometraje:110},async()=>{saved=true;}),/No puedes modificar/);
    assert.equal(saved,false);assert.equal(writes.length,0);
});
