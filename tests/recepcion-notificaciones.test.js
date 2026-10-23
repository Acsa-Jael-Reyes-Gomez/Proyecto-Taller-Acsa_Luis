const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resumirNotificaciones, esperaVencida } = require('../src/scripts/recepcion-notificaciones');

test('Espera se vuelve roja solo despues de 24 horas y requiere una fecha valida', () => {
    const ahora = new Date('2026-10-04T12:00:00');
    for (const [fechaCreacion, esperado] of [['2026-10-03 12:00:01', false], ['2026-10-03 12:00:00', false], ['2026-10-03 11:59:59', true], ['2026-10-02 12:00:00', true], [null, false], ['invalida', false]]) {
        assert.equal(esperaVencida({ estado: 'Espera', fechaCreacion }, ahora), esperado, String(fechaCreacion));
    }
    assert.equal(esperaVencida({ estado: 'Activa', fechaCreacion: '2026-10-01 12:00:00' }, ahora), false);
});
test('Campana incluye Proximo, Urgente y Servicio pasado sin duplicar vehiculos', () => {
    const ordenes = [{estado:'Espera'}, {estado:'Espera'}, {estado:'Activa'}, {estado:'Entregado'}];
    const servicios = [
        {placa:'P-1',estado_alerta:'Urgente',dias_restantes:0,kilometros_restantes:100},
        {placa:'P-1',estado_alerta:'Proximo',dias_restantes:20,kilometros_restantes:500},
        {placa:'P-2',estado_alerta:'Servicio pasado',dias_restantes:null,kilometros_restantes:-10},
        {placa:'P-3',estado_alerta:'Proximo',dias_restantes:10,kilometros_restantes:null},
        {placa:'P-4',estado_alerta:'Pendiente',dias_restantes:100,kilometros_restantes:10000},
        {placa:'P-5',dias_restantes:null,kilometros_restantes:null}
    ];
    const result = resumirNotificaciones(ordenes, servicios);
    assert.equal(result.espera.length, 2);
    assert.equal(result.pendientes.length, 4);
    assert.equal(result.vehiculos, 3);
});
test('Campana sin avisos devuelve cero y no confunde referencias ausentes con vencimientos', () => {
    const result = resumirNotificaciones([], [{placa:'P-1',dias_restantes:null,kilometros_restantes:null}]);
    assert.equal(result.espera.length, 0); assert.equal(result.vehiculos, 0); assert.equal(result.pendientes.length, 0);
});
