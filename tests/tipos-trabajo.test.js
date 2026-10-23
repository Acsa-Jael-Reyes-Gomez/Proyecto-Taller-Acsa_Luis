const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMaintenanceLayer } = require('../src/maintenance-layer');
const { createRules } = require('../src/maintenance-rules');

test('Catalogo distingue tipo de trabajo de clasificacion preventiva o correctiva', async () => {
    const layer = createMaintenanceLayer({ query: async sql => {
        assert.match(sql, /JOIN tipos_trabajo/);
        return [[{id_servicio:1, nombre:'Cambio de aceite', tipo:'Preventivo', id_tipo_trabajo:1, tipo_trabajo:'Mecanico'}]];
    } }, {});
    const [servicio] = await layer.listServicios();
    assert.equal(servicio.tipo, 'Preventivo');
    assert.equal(servicio.tipoTrabajo, 'Mecanico');
    assert.equal(servicio.idTipoTrabajo, 1);
});

test('Guardar requiere que el servicio pertenezca a uno de los tipos de trabajo seleccionados', async () => {
    const campos = ['manoMecanico', 'manoPintura', 'manoElectronico', 'manoPinchazo'];
    for (let index = 0; index < campos.length; index++) {
        const connection = { execute: async sql => {
            if (sql.includes('FROM detalle_servicio')) return [[]];
            if (sql.includes('FROM servicios')) return [[{id_servicio:1, id_tipo_trabajo:index + 1, tipo:'Correctivo', tipo_vehiculo:'Todos'}]];
            return [{}];
        } };
        const rules = createRules({});
        const orden = {estado:'Activa', kilometraje:100, servicios:[1], [campos[index]]:true};
        const contexto = {vehiculo:{id_vehiculo:1, tipo:'Sedan', nivel_uso:'Normal'}, nuevoKm:false};
        await rules.completarOrden(connection, 1, orden, contexto);
        await assert.rejects(rules.completarOrden(connection, 1, {...orden, [campos[index]]:false, [campos[(index + 1) % 4]]:true}, contexto), /no corresponde al tipo de trabajo/);
    }
});
