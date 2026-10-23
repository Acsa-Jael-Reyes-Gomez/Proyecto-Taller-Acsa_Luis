const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const tick = () => new Promise(resolve => setImmediate(resolve));
test('Buscar placa autocompleta datos, muestra solo nombres y envia el ID del vehiculo', async () => {
    class Element {
        constructor() { this.value = ''; this.handlers = {}; }
        addEventListener(name, fn) { this.handlers[name] = fn; }
        replaceChildren(...nodes) { this.children = nodes; }
        setCustomValidity(value) { this.validationMessage = value; }
        querySelector() { return { value: '1/2' }; }
        reportValidity() { return !nodes.get('recepcionVehiculo').validationMessage; }
        reset() { this.handlers.reset(); }
    }
    const nodes = new Map();
    const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); }, createElement: () => new Element() };
    let received;
    const vehicle = { id: 9, placa: 'P-380GHJ', marca: 'Toyota', modelo: '2024', idCliente: 4, kilometraje: 54851, nivelUso: 'Alto', estado: 'En taller', kilometrajeBloqueado:false };
    const window = { location: { search: '' }, api: {
        vehiculos: { list: async () => [vehicle, { ...vehicle, id: 10, placa: 'P-111AAA', estado: 'En taller', kilometrajeBloqueado:true }] },
        mecanicos: { list: async () => [] }, pilotos: { list: async () => [{ id: 4, nombre: 'Mario Morales', dpi: '1234567890123' }] },
        recepcion: { create: async value => { received = value; return { id: 1 }; } }
    } };
    vm.runInNewContext(fs.readFileSync('src/scripts/modules/recepcion.js', 'utf8'), { document, window, URLSearchParams, setTimeout: fn => fn() });
    await tick();
    assert.deepEqual(nodes.get('placasRecepcion').children.map(node => node.value), ['P-380GHJ']);
    assert.equal(nodes.get('placasRecepcion').children[0].textContent, 'P-380GHJ');
    assert.equal(nodes.get('recepcionCliente').children[1].textContent, 'Mario Morales');
    const plate = nodes.get('recepcionVehiculo');
    plate.value = 'p380ghj'; plate.handlers.input();
    assert.equal(nodes.get('recepcionMarca').value, 'Toyota');
    const km = nodes.get('recepcionKm');
    km.value = '54000'; km.handlers.input();
    assert.match(km.validationMessage, /menor.*54851/);
    assert.match(nodes.get('recepcionKmValidacion').textContent, /menor/);
    km.value = '54851'; km.handlers.input();
    assert.equal(km.validationMessage, '');
    assert.equal(nodes.get('recepcionModelo').value, '2024');
    assert.equal(nodes.get('recepcionCliente').value, 4);
    await nodes.get('formRecepcion').handlers.submit({ preventDefault() {} });
    assert.equal(received.idVehiculo, 9);
    for (const value of ['P-111AAA', 'P-999ZZZ']) {
        plate.value = value; plate.handlers.input(); received = null;
        await nodes.get('formRecepcion').handlers.submit({ preventDefault() {} });
        assert.equal(received, null);
        assert.equal(nodes.get('recepcionMarca').value, '');
    }
});
test('Nuevo cliente conserva el borrador y lo restaura solo con el retorno correspondiente', async () => {
    class Element {
        constructor() { this.value = ''; this.checked = false; this.handlers = {}; }
        addEventListener(name, fn) { this.handlers[name] = fn; }
        setCustomValidity(value) { this.validationMessage = value; }
        replaceChildren(...children) { this.children = children; }
        append() {}
        querySelector() { return { value: '3/4' }; }
        querySelectorAll() { return []; }
    }
    const storage = new Map();
    const sessionStorage = { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key), removeItem: key => storage.delete(key) };
    function setup(search = '') {
        const nodes = new Map();
        const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); }, createElement: () => new Element() };
        const list = async () => [];
        const window = { location: { search }, history: { replaceState() {} }, api: { vehiculos: { list }, pilotos: { list }, mecanicos: { list }, recepcion: { list } } };
        vm.runInNewContext(fs.readFileSync('src/scripts/modules/recepcion.js', 'utf8'), { document, window, sessionStorage, URLSearchParams, crypto: { randomUUID: () => 'token-prueba' }, setTimeout: fn => fn() });
        return { nodes, window };
    }
    const first = setup(); await tick();
    // Los campos del borrador se consultan al hacer clic.
    first.nodes.set('recepcionMotivo', Object.assign(new Element(), { value: 'Revisar frenos' }));
    first.nodes.get('nuevoClienteRecepcion').handlers.click();
    assert.equal(first.window.location.href, 'pilotos.html?nuevo=1&origen=recepcion&retorno=token-prueba');
    const unrelated = setup(''); await tick();
    assert(storage.has('recepcionNuevoCliente'));
    const returned = setup('?cliente=7&retorno=token-prueba'); await tick();
    assert.equal(returned.nodes.get('recepcionMotivo').value, 'Revisar frenos');
    assert.equal(returned.nodes.get('recepcionCliente').value, '7');
    assert(!storage.has('recepcionNuevoCliente'));
});
test('Imprimir boleta permanece visible y usa la ficha guardada incluso si falla recargar', async () => {
    class Element {
        constructor() { this.value = ''; this.handlers = {}; this.hidden = false; this.checked = false; }
        addEventListener(name, fn) { this.handlers[name] = fn; }
        setCustomValidity(value) { this.validationMessage = value; }
        replaceChildren(...nodes) { this.children = nodes; }
        append(...nodes) { this.children = [...(this.children || []), ...nodes]; }
        reportValidity() { return true; }
        querySelector() { return { value: '1/2' }; }
        reset() { this.handlers.reset(); }
        showModal() { this.open = true; }
        close() { this.open = false; }
    }
    const nodes = new Map();
    const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); }, createElement() { return new Element(); } };
    let fail = false, printed = false, fetched = null;
    const list = async () => { if (fail) throw Error('Sin conexion'); return []; };
    const stored = { id_recepcion: 8, motivo: 'Datos persistidos' };
    const window = { api: { vehiculos: { list }, mecanicos: { list }, pilotos: { list }, recepcion: { list, create: async () => { fail = true; return { id: 8 }; }, get: async id => { fetched = id; return stored; } } }, recepcionDocumento: { crearDocumento: (_document, value) => { assert.equal(value, stored); return new Element(); } }, print: () => { printed = true; } };
    window.location = { search: '' };
    vm.runInNewContext(fs.readFileSync('src/scripts/modules/recepcion.js', 'utf8'), { document, window, URLSearchParams, setTimeout: fn => fn() });
    await tick();
    await nodes.get('formRecepcion').handlers.submit({ preventDefault() {} });
    assert.equal(nodes.get('generarRecepcion').hidden, false);
    assert.equal(nodes.get('generarRecepcion').disabled, false);
    assert(nodes.get('recepcionMensaje').textContent.includes('registrada'));
    nodes.get('generarRecepcion').handlers.click(); await tick();
    assert.equal(fetched, 8); assert.equal(nodes.get('documentoRecepcion').open, true);
    nodes.get('imprimirRecepcion').handlers.click(); assert(printed);
    nodes.get('formRecepcion').reset(); assert.equal(nodes.get('generarRecepcion').disabled, true);
});
