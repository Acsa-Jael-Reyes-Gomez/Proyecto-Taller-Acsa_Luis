const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRules } = require('../src/maintenance-rules');

const original = { id_vehiculo: 9, placa: 'P-123ABC', estado: 'En proceso', fecha_entrada: '2026-10-01', hora_entrada: '09:15:00', periodo_entrada: 'AM', kilometraje: 56001, vehiculo: 'Toyota Yaris 2007', marca: 'Toyota', tipo_vehiculo: 'Sedan', piloto: 'Luis' };
function connection(anterior) {
    return { execute: async sql => {
        if (sql.includes('FROM ordenes_trabajo')) return [[anterior]];
        if (sql.includes('FROM vehiculos')) return [[{ id_vehiculo: 9, placa: original.placa, kilometraje: 56001 }]];
        if (sql.includes('FROM historial_kilometraje')) return [[{ id_historial_kilometraje: 1 }]];
        throw Error(sql);
    } };
}
test('Guardar conserva entrada y kilometraje y descarta salida manual antes de finalizar', async () => {
    const orden = { estado: 'Activa', placa: original.placa, fechaEntrada: '2026-10-04', horaEntrada: '01:00', kilometraje: 99999, fechaSalida: '2026-10-04', horaSalida: '05:00' };
    await createRules({}).prepararOrden(connection(original), orden, 1);
    assert.equal(orden.fechaEntrada, original.fecha_entrada);
    assert.equal(orden.horaEntrada, '09:15');
    assert.equal(orden.kilometraje, 56001);
    assert.equal(orden.fechaSalida, null);
    assert.equal(orden.horaSalida, null);
});

test('Guardar los datos de una orden en espera la activa aunque el cliente conserve el estado Espera', async () => {
    for (const estado of [undefined, 'Espera', 'Activa']) {
        const orden = { estado, placa: original.placa, kilometraje: 56001 };
        await createRules({}).prepararOrden(connection({...original, estado:'Espera'}), orden, 1);
        assert.equal(orden.estado, 'Activa');
        assert.equal(orden.fechaSalida, null);
        assert.equal(orden.horaSalida, null);
    }
});
test('Finalizar genera salida y editar o entregar conserva ese momento', async () => {
    const orden = { estado: 'Finalizada', placa: original.placa, kilometraje: 56001, fechaSalida: '2000-01-01', horaSalida: '01:00' };
    await createRules({}).prepararOrden(connection(original), orden, 1);
    assert.notEqual(orden.fechaSalida, '2000-01-01');
    assert.match(orden.horaSalida, /^\d{2}:\d{2}$/);
    assert.ok(['AM', 'PM'].includes(orden.periodoSalida));
    const finalizada = { ...original, estado: 'Finalizada', fecha_salida: orden.fechaSalida, hora_salida: orden.horaSalida, periodo_salida: orden.periodoSalida };
    for (const estado of ['Finalizada', 'Entregado']) {
        const cambio = { ...orden, estado, fechaSalida: '2000-01-01', horaSalida: '01:00' };
        await createRules({}).prepararOrden(connection(finalizada), cambio, 1);
        assert.equal(cambio.fechaSalida, orden.fechaSalida);
        assert.equal(cambio.horaSalida, orden.horaSalida);
    }
});
