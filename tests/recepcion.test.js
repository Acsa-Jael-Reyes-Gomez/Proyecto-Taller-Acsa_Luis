const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRecepcionLayer, validarRecepcion } = require('../src/recepcion-layer');
const valid = { idVehiculo: 1, idCliente: 4, kilometraje: 200, nivelUso: 'Normal', combustible: '1/2', motivo: 'Revisión', espejos: true, bateria: false, documentos: true };
function setup({ estado = 'Activo', ordenPendiente = estado === 'En taller', failUpdate = false, missingClient = false, failOrder = false } = {}) {
    const calls = [];
    const connection = {
        beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'),
        execute: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.startsWith('SELECT v.')) return [[{ id_vehiculo: 1, placa: 'P-123ABC', marca: 'Honda', modelo: '2024', propietario: 'Ana', kilometraje: 100, estado }]];
            if (sql.startsWith('SELECT id_orden FROM ordenes_trabajo')) return [ordenPendiente ? [{id_orden:1}] : []];
            if (sql.startsWith('SELECT nombre FROM clientes')) return [missingClient ? [] : [{ nombre: 'Ana registrada' }]];
            if (sql.startsWith('SELECT nombre')) return [[{ nombre: 'Carlos' }]];
            if (sql.startsWith('INSERT INTO ordenes_trabajo') && failOrder) throw Error('Error al crear orden');
            if (sql.startsWith('INSERT')) return [{ insertId: 8 }];
            if (failUpdate) throw Error('Error al actualizar');
            return [{ affectedRows: 1 }];
        }
    };
    return { calls, layer: createRecepcionLayer({ query: async () => [[]], getConnection: async () => connection }) };
}
test('Recepción rechaza campos inválidos y kilometraje vacío', () => {
    for (const patch of [{ idVehiculo: 0 }, { kilometraje: '' }, { kilometraje: -1 }, { kilometraje: 1.5 }, { nivelUso: 'Otro' }, { combustible: '' }, { motivo: ' ' }, { idMecanico: -1 }]) assert.throws(() => validarRecepcion({ ...valid, ...patch }));
    assert.equal(validarRecepcion(valid).espejos, true);
});
test('Guarda custodia y cambia estado en una sola transacción', async () => {
    const { layer, calls } = setup();
    assert.deepEqual(await layer.create({ ...valid, idMecanico: 2 }, 3), { id: 8, idOrden: 8, numeroOrden: 'REC-8' });
    const insert = calls.find(c => c.sql?.startsWith('INSERT'));
    assert.deepEqual(insert.params.slice(10, 13), [1, 0, 1]);
    assert.equal(insert.params[4], 'Ana registrada');
    const order = calls.find(c => c.sql?.startsWith('INSERT INTO ordenes_trabajo'));
    assert(order.sql.includes("'Espera'"));
    assert.deepEqual(order.params.slice(0, 3), ['REC-8', 8, 1]);
    assert.equal(order.params[5], 'Ana registrada');
    assert.deepEqual(calls.find(c => c.sql?.startsWith('UPDATE')).params, [4, 200, 'Normal', 1]);
    assert(calls.some(c => c.sql?.includes("estado = 'En taller'")));
    assert(calls.includes('commit')); assert(!calls.includes('rollback')); assert.equal(calls.at(-1), 'release');
});
test('Evita ingresos duplicados y retroceso del odómetro', async () => {
    const duplicate = setup({ estado: 'En taller' });
    await assert.rejects(duplicate.layer.create(valid, 3), /ya se encuentra/);
    assert(duplicate.calls.includes('rollback'));
    const lower = setup();
    await assert.rejects(lower.layer.create({ ...valid, kilometraje: 99 }, 3), /menor/);
    await assert.rejects(lower.layer.create(valid, null), /sesion/);
});
test('Rechaza clientes invalidos o eliminados antes de guardar', async () => {
    assert.throws(() => validarRecepcion({ ...valid, idCliente: '' }), /cliente registrado/);
    const { layer, calls } = setup({ missingClient: true });
    await assert.rejects(layer.create(valid, 3), /cliente ya no existe/);
    assert(!calls.some(c => c.sql?.startsWith('INSERT')));
    assert(calls.includes('rollback'));
});

test('Una placa sin ordenes pendientes permite nueva recepcion aunque el vehiculo siga En taller', async () => {
    const {layer,calls} = setup({estado:'En taller',ordenPendiente:false});
    assert.equal((await layer.create(valid,3)).id,8);
    const check=calls.find(call=>call.sql?.startsWith('SELECT id_orden FROM ordenes_trabajo'));
    for(const estado of ['Espera','Activa','En proceso','Finalizada']) assert(check.sql.includes("'"+estado+"'"));
    assert(!check.sql.includes("'Entregado'"));
    assert(check.sql.includes('FOR UPDATE'));
});

test('Una orden pendiente bloquea recepcion incluso con el vehiculo marcado Activo', async () => {
    const {layer,calls}=setup({estado:'Activo',ordenPendiente:true});
    await assert.rejects(layer.create(valid,3),/pendiente de entrega/);
    assert(!calls.some(call=>call.sql?.startsWith('INSERT')));
});

test('Fotos se insertan con la recepcion y se revierten si falla la orden', async()=>{
    const {layer,calls}=setup({failOrder:true});
    await assert.rejects(layer.create({...valid,fotoPlaca:'P-123ABC',fotos:[{archivo:'foto.jpg',imagen:Buffer.from('jpeg'),nombre:'frente',origen:'Celular'}]},3),/Error al crear orden/);
    const foto=calls.find(call=>call.sql?.startsWith('INSERT INTO recepcion_fotos'));
    assert.deepEqual(foto.params,[8,'foto.jpg',Buffer.from('jpeg'),'frente','Celular',3]);
    assert(calls.includes('rollback'));assert(!calls.includes('commit'));
});
test('Revierte la ficha si falla el cambio de estado', async () => {
    const { layer, calls } = setup({ failUpdate: true });
    await assert.rejects(layer.create(valid, 3), /Error al actualizar/);
    assert(calls.includes('rollback')); assert(!calls.includes('commit')); assert.equal(calls.at(-1), 'release');
});
test('Revierte la recepcion si falla la apertura de la orden', async () => {
    const { layer, calls } = setup({ failOrder: true });
    await assert.rejects(layer.create(valid, 3), /Error al crear orden/);
    assert(calls.includes('rollback')); assert(!calls.includes('commit'));
    assert(!calls.some(c => c.sql?.startsWith('UPDATE')));
    assert.equal(calls.at(-1), 'release');
});
test('Todos los módulos comparten orden, etiquetas y enlace activo', () => {
    const files = ['dashboard', 'recepcion', 'pilotos', 'vehiculos', 'ordenes-trabajo', 'repuestos', 'mecanicos', 'historial'];
    for (const file of files) {
        const html = fs.readFileSync(`src/views/${file}.html`, 'utf8');
        const nav = html.match(/<nav class="sidebar-nav"[\s\S]*?<\/nav>/)[0];
        assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(m => m[1]), files.map(f => f + '.html'));
        assert.equal((nav.match(/class="nav-button active"/g) || []).length, 1);
        assert(nav.includes('<span class="nav-label">Dashboard</span>'));
        const labels = [...nav.matchAll(/<span class="nav-label">([^<]+)<\/span>/g)].map(m => m[1]);
        assert.deepEqual(labels, ['Dashboard', 'Recepcion', 'Cliente', 'Vehiculo', 'Ordenes de Trabajo', 'Repuestos', 'Mecanicos', 'Historial']);
    }
});
test('Consulta la ficha persistida por ID y rechaza registros inexistentes', async () => {
    const stored = { id_recepcion: 8, cliente: 'Ana', combustible: '1/2', motivo: 'Revision' };
    const layer = createRecepcionLayer({ query: async () => [[]], execute: async (sql, params) => {
        assert.equal(sql, 'SELECT * FROM recepciones WHERE id_recepcion = ?');
        return [params[0] === 8 ? [stored] : []];
    } });
    assert.deepEqual(await layer.get(8), stored);
    await assert.rejects(layer.get(9), /no existe/);
    await assert.rejects(layer.get('8 OR 1=1'), /invalida/);
});
test('Documento conserva custodia y observaciones como texto e incluye firmas', () => {
    const { crearDocumento } = require('../src/scripts/recepcion-documento');
    const document = { createElement: tag => ({ tag, children: [], append(node) { this.children.push(node); } }) };
    const reception = { id_recepcion: 8, fecha_ingreso: '2026-10-03 17:30:00', cliente: '<script>cliente</script>', placa: 'P-123ABC', vehiculo: 'Honda 2024', kilometraje: 200, nivel_uso: 'Normal', combustible: '1/2', espejos: 1, bateria: 0, documentos: 1, motivo: 'Revision', observaciones: 'Golpe\nen puerta' };
    const article = crearDocumento(document, reception);
    const allNodes = node => [node, ...node.children.flatMap(allNodes)];
    const nodes = allNodes(article);
    const text = nodes.map(node => node.textContent).join('\n');
    for (const expected of ['Ficha #8', '2026-10-03 17:30:00', '<script>cliente</script>', 'Nivel de combustible: 1/2', 'Espejos', 'Presente', 'Bateria', 'No presente', 'Golpe\nen puerta', 'Firma del cliente / propietario', 'Firma de quien recibe en el taller']) assert(text.includes(expected));
    assert(nodes.every(node => node.innerHTML === undefined));
});
