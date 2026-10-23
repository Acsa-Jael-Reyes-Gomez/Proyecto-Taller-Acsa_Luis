const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const tick = () => new Promise(resolve => setImmediate(resolve));
test('Indicadores de ordenes cuentan cada estado en el mes seleccionado', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    page.nodes.get('mesIndicadoresOrdenes').value = '2026-10';
    vm.runInContext(`ordenesTrabajo.splice(0, ordenesTrabajo.length, ...[
        {id:1, numero:'500', fechaCreacion:'2026-10-01', estado:'Activa'},
        {id:2, numero:'501', fechaCreacion:'2026-10-02', estado:'Abierta'},
        {id:3, numero:'502', fechaCreacion:'2026-10-02', estado:'En proceso'},
        {id:4, numero:'503', fechaCreacion:'2026-10-03', estado:'Finalizada'},
        {id:5, numero:'REC-1', fechaCreacion:'2026-10-03', estado:'Espera'},
        {id:6, numero:'504', fechaCreacion:'2026-10-03', estado:'Entregado'},
        {id:7, numero:'505', fechaCreacion:'2026-09-03', estado:'Activa'}
    ]); renderIndicadoresOrdenes();`, page.ctx);
    for (const [id, expected] of [['totalOrdenesTrabajo',6],['ordenesAbiertas',2],['ordenesProceso',1],['ordenesFinalizadas',1],['ordenesEspera',1]]) assert.equal(Number(page.nodes.get(id).innerText), expected);
    page.nodes.get('filtroEstadoOrdenTrabajo').value = 'Espera';
    vm.runInContext('renderOrdenesTrabajo()', page.ctx);
    assert(page.nodes.get('tablaOrdenesTrabajo').innerHTML.includes('REC-1'));
    assert(page.nodes.get('tablaOrdenesTrabajo').innerHTML.includes('<td></td>'));
    assert(!page.nodes.get('tablaOrdenesTrabajo').innerHTML.includes('SERIE A - 500'));
    page.nodes.get('mesIndicadoresOrdenes').value = '2026-09';
    vm.runInContext('renderIndicadoresOrdenes()', page.ctx);
    assert.equal(Number(page.nodes.get('ordenesAbiertas').innerText), 1);
    assert.equal(Number(page.nodes.get('ordenesEspera').innerText), 0);
});
test('Una orden en espera abre numero y serie vacios y conserva datos del vehiculo', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    vm.runInContext(`cargarOrdenEnFormulario({estado:'Espera', numero:'REC-4', serie:'RECEPCION', placa:'P-123ABC', vehiculo:'2024', marca:'Honda', piloto:'Ana', servicios:[], repuestos:[]})`, page.ctx);
    assert.equal(page.nodes.get('ordenNumero').value, '');
    assert.equal(page.nodes.get('ordenSerie').value, '');
    assert.equal(page.nodes.get('ordenPlaca').value, 'P-123ABC');
    assert.equal(page.nodes.get('ordenPiloto').value, 'Ana');
});

test('Guardar una orden en espera no exige salida y envia la actualizacion como Activa', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    let saved;
    page.ctx.window.ordenValidation = require('../src/scripts/orden-validation');
    page.ctx.window.api.ordenes.checkIdentidad = async () => ({duplicado:false});
    page.ctx.window.api.ordenes.update = async (id, value) => { saved={id,value}; };
    const servicios = page.nodes.get('ordenServicios');
    servicios.options = [{value:'1',textContent:'Cambio de aceite',dataset:{tipoTrabajo:'Mecanico'},selected:true}];
    Object.defineProperty(servicios, 'selectedOptions', {get:()=>servicios.options.filter(option=>option.selected)});
    vm.runInContext(`
        const pendiente={id:42,estado:'Espera',numero:'REC-42',serie:'RECEPCION',fechaEntrada:'2026-10-04',horaEntrada:'09:00',periodoEntrada:'AM',fechaSalida:'',horaSalida:'',periodoSalida:'PM',placa:'P-123ABC',vehiculo:'Yaris',piloto:'Luis',marca:'Toyota',tipoVehiculo:'Sedan',kilometraje:'54851',proximoServicio:'60000',idMecanico:1,manoMecanico:true,totalManoObra:'0',trabajos:'Cambio de aceite',servicios:[1],repuestos:[]};
        ordenesTrabajo.push(pendiente); catalogoMecanicos=[{id_mecanico:1,nombre:'Ana'}];
        modoOrdenTrabajo='edicion'; ordenSeleccionadaId=42;
        cargarOrdenEnFormulario(pendiente); setOrdenSoloLectura(false);
        setOrdenFieldValue('ordenNumero','505'); setOrdenFieldValue('ordenSerie','A');
    `,page.ctx);
    const salida=page.nodes.get('ordenHoraSalida');
    salida.required=true; salida.disabled=true; salida.value='';
    await page.nodes.get('formOrdenTrabajo').handlers.submit({preventDefault(){}});
    assert.deepEqual(page.alerts, []);
    assert.equal(saved.id,42);
    assert.equal(saved.value.estado,'Activa');
    assert.equal(saved.value.horaSalida,'');
});
function setup(name) {
    class Element {
        constructor(id = '') {
            this.value = id.startsWith('filtro') ? 'todos' : '';
            this.handlers = {}; this.dataset = {}; this.options = []; this.children = [];
            this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
        }
        addEventListener(name, callback) { this.handlers[name] = callback; }
        querySelectorAll() { return []; }
        querySelector() { return this.cell || (this.cell = new Element()); }
        setCustomValidity(value) { this.validationMessage = value; }
        setAttribute() {} removeAttribute() {} focus() {} reset() {} reportValidity() { return true; }
        replaceChildren(...children) { this.children = children; this.options = children; }
        append(child) { this.options.push(child); }
    }
    const nodes = new Map();
    const html = fs.readFileSync(path.join(__dirname, '../src/views', name + '.html'), 'utf8');
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes.set(match[1], new Element(match[1]));
    const state = { fail: false, data: [] };
    const list = async () => { if (state.fail) throw Error('Sin conexion'); return state.data; };
    const api = { mecanicos: { list }, vehiculos: { list }, pilotos: { list }, ordenes: { list }, servicios: { list }, repuestos: { list, historial: list, ultimosIngresos: list } };
    const alerts = [];
    const document = { hidden: false, getElementById(id) { assert(nodes.has(id), 'ID inexistente: ' + id); return nodes.get(id); }, querySelectorAll: () => [], createElement: () => new Element(), addEventListener() {} };
    const ctx = vm.createContext({ document, window: { api, liveValidation: require('../src/scripts/live-validation'), location: { search: '' }, ui: { alert: async m => alerts.push(m), confirm: async () => false }, addEventListener() {} }, URLSearchParams, setInterval() {}, alert: m => alerts.push(m), console });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/scripts/modules', (name === 'pilotos' ? 'clientes' : name) + '.js'), 'utf8'), ctx);
    return { ctx, nodes, state, alerts };
}
test('Editar una orden bloquea recepcion y salida, y permite mecanico y proximo servicio', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    vm.runInContext('ordenSeleccionadaId = 4; setOrdenSoloLectura(false)', page.ctx);
    for (const id of ['ordenFechaEntrada', 'ordenHoraEntrada', 'ordenPeriodoEntrada', 'ordenFechaSalida', 'ordenHoraSalida', 'ordenPeriodoSalida', 'ordenPlaca', 'ordenVehiculo', 'ordenPiloto', 'ordenMarca', 'ordenKilometraje', 'ordenTipoVehiculo']) assert.equal(page.nodes.get(id).disabled, true, id);
    for (const id of ['ordenMecanico', 'ordenProximoServicio']) assert.notEqual(page.nodes.get(id).disabled, true, id);
});
for (const [name, load, indicator, table, empty] of [
    ['vehiculos', 'cargarVehiculos', 'totalVehiculos', 'tablaVehiculos', 'No hay vehiculos'],
    ['pilotos', 'cargarPilotos', 'totalPilotos', 'tablaPilotos', 'No hay clientes'],
    ['ordenes-trabajo', 'cargarDatosOrdenes', 'totalOrdenesTrabajo', 'tablaOrdenesTrabajo', 'No hay ordenes'],
    ['repuestos', 'cargarRepuestos', 'totalRepuestos', 'tablaRepuestos', 'No hay repuestos']
]) {
    test(name + ': consulta vacia, fallo y recuperacion sin datos ficticios', async () => {
        const page = setup(name); await tick();
        assert.equal(page.alerts.length, 0);
        assert.equal(Number(page.nodes.get(indicator).innerText), 0);
        assert(page.nodes.get(table).innerHTML.includes(empty));
        page.state.fail = true;
        await vm.runInContext(load + '()', page.ctx);
        assert.equal(page.nodes.get(indicator).innerText, '--');
        assert(page.nodes.get(table).cell.textContent.includes('No se pudieron'));
        page.state.fail = false;
        await vm.runInContext(load + '()', page.ctx);
        assert.equal(Number(page.nodes.get(indicator).innerText), 0);
        assert(page.nodes.get(table).innerHTML.includes(empty));
    });
}
test('Consulta de cliente oculta agregar vehiculo; edicion lo conserva', async () => {
    const page = setup('pilotos'); await tick();
    vm.runInContext('setRegistroPilotoSoloLectura(true)', page.ctx);
    assert.equal(page.nodes.get('btnAgregarVehiculoCliente').hidden, true);
    vm.runInContext('setRegistroPilotoSoloLectura(false)', page.ctx);
    assert.equal(page.nodes.get('btnAgregarVehiculoCliente').hidden, false);
});
test('Ordenes usa existencia actual de inventario y no sustituye referencias perdidas por cero', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    vm.runInContext('inventarioRepuestos.push({id: 7, existencia: 23});', page.ctx);
    assert.equal(vm.runInContext('normalizarRepuestosOrden([{id: 999, idRepuesto: 7, cantidad: 2}])[0].existencia', page.ctx), 23);
    assert.equal(vm.runInContext('normalizarRepuestosOrden([{id: 999, idRepuesto: null, cantidad: 2}])[0].existencia', page.ctx), null);
    assert.equal(vm.runInContext('normalizarRepuestosOrden([{id: 999, idRepuesto: null, cantidad: 2}])[0].idRepuesto', page.ctx), null);
});

test('Estado solo visible en edicion; cancelar no escribe y confirmar actualiza el indicador', async () => {
    const page = setup('vehiculos'); await tick();
    vm.runInContext("vehiculos = [{id: 12, placa: 'P-123', estado: 'Activo', tipo: 'Sedan', kilometraje: 0}]; vehiculoSeleccionadoId = 12; modoRegistroVehiculo = 'vista'; actualizarControlEstadoVehiculo();", page.ctx);
    assert.equal(page.nodes.get('vehiculoEstadoEdicion').hidden, true);
    vm.runInContext("modoRegistroVehiculo = 'nuevo'; actualizarControlEstadoVehiculo();", page.ctx);
    assert.equal(page.nodes.get('vehiculoEstadoEdicion').hidden, true);
    vm.runInContext("modoRegistroVehiculo = 'edicion'; actualizarControlEstadoVehiculo();", page.ctx);
    assert.equal(page.nodes.get('vehiculoEstadoEdicion').hidden, false);
    let writes = 0;
    page.ctx.window.api.vehiculos.setEstado = async (id, estado) => { writes++; return {id, estado}; };
    await page.nodes.get('btnCambiarEstadoVehiculo').handlers.click();
    assert.equal(writes, 0);
    page.nodes.get('vehiculoModelo').value = 'Borrador';
    page.ctx.window.ui.confirm = async (message, options) => { assert.equal(options.tone, 'danger'); return true; };
    await page.nodes.get('btnCambiarEstadoVehiculo').handlers.click();
    assert.equal(writes, 1);
    assert.equal(page.nodes.get('vehiculosInactivos').innerText, 1);
    assert.equal(page.nodes.get('btnCambiarEstadoVehiculo').textContent, 'Activar');
    assert.equal(page.nodes.get('vehiculoModelo').value, 'Borrador');
    assert(page.nodes.get('btnCambiarEstadoVehiculo').className.includes('is-success'));
    page.ctx.window.ui.confirm = async (message, options) => { assert.equal(options.tone, 'success'); return true; };
    await page.nodes.get('btnCambiarEstadoVehiculo').handlers.click();
    assert.equal(page.nodes.get('btnCambiarEstadoVehiculo').textContent, 'Desactivar');
    assert(page.nodes.get('btnCambiarEstadoVehiculo').className.includes('is-danger'));
});

test('Busqueda de vehiculos alterna placa, nombre y modelo sin perder espacios', async () => {
    const page = setup('vehiculos'); await tick();
    for (const [input, expected] of [['p', 'P-'], ['P-5', 'P-5'], ['p5', 'P-5'], ['S-S', 'SS'], ['H-ernan Cortes', 'Hernan Cortes'], ['2026', '2026'], ['', '']]) {
        page.ctx.searchInput = input;
        assert.equal(vm.runInContext('formatVehicleSearchInput(searchInput)', page.ctx), expected);
    }
    assert.equal(vm.runInContext("formatVehicleSearchInput('P', true)", page.ctx), 'P');
    vm.runInContext("vehiculos = [{id: 1, placa: 'P-500HJK', tipo: 'Sedan', estado: 'Activo', modelo: '2026', cliente: 'Hernan Cortes'}, {id: 2, placa: 'M-919GHJ', tipo: 'Moto', estado: 'Activo', modelo: '2020', cliente: 'Ana Lopez'}];", page.ctx);
    const field = page.nodes.get('buscarVehiculo');
    for (const query of ['P-5', 'H-ernan Cortes', '2026']) {
        field.value = query;
        field.handlers.input({ inputType: 'insertText' });
        assert.equal(vm.runInContext('getVehiculosFiltrados().length', page.ctx), 1);
        assert.equal(vm.runInContext('getVehiculosFiltrados()[0].id', page.ctx), 1);
    }
    field.value = ''; field.handlers.input({ inputType: 'deleteContentBackward' });
    assert.equal(vm.runInContext('getVehiculosFiltrados().length', page.ctx), 2);
    assert.equal(vm.runInContext("formatVehiclePlateInput('p500')", page.ctx), 'P-500');
});


test('Indicadores de ordenes filtran mes y anio de creacion, conservando inventario actual', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    const mes = page.nodes.get('mesIndicadoresOrdenes');
    const hoy = new Date();
    assert.equal(mes.value, `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`);
    vm.runInContext(`ordenesTrabajo.push(
        {fechaCreacion: '2026-09-01 10:00:00', fechaEntrada: '2026-08-30', estado: 'Abierta'},
        {fechaCreacion: '2026-09-30 23:59:59', estado: 'En proceso'},
        {fechaCreacion: '2026-08-31 23:59:59', estado: 'Finalizada'},
        {fechaCreacion: '2025-09-01 00:00:00', estado: 'Finalizada'}
    ); inventarioRepuestos.push({existencia: 5}, {existencia: '7'}, {existencia: 0});`, page.ctx);
    for (const [value, total, abiertas, proceso, finalizadas] of [
        ['2026-09', 2, 1, 1, 0], ['2026-08', 1, 0, 0, 1],
        ['2025-09', 1, 0, 0, 1], ['2026-10', 0, 0, 0, 0]
    ]) {
        mes.value = value; mes.handlers.change();
        for (const [id, expected] of [['totalOrdenesTrabajo', total], ['ordenesAbiertas', abiertas], ['ordenesProceso', proceso], ['ordenesFinalizadas', finalizadas], ['totalRepuestosOrdenes', 12]]) {
            assert.equal(Number(page.nodes.get(id).innerText), expected, id);
        }
    }
    mes.value = ''; mes.handlers.change();
    assert.match(mes.value, /^\d{4}-\d{2}$/);
});


test('Busqueda de ordenes: placa, cliente, numero y mecanico con formato automatico', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    const field = page.nodes.get('buscarOrdenTrabajo');
    vm.runInContext(`ordenesTrabajo.push(
        {numero: 2026, placa: 'P-500HJK', piloto: 'Hernan Cortes', mecanico: 'Jose Lopez', estado: 'Abierta'},
        {numero: 99, placa: 'M-919GHJ', piloto: 'Ana Perez', mecanico: 'Luis Gomez', estado: 'Finalizada'}
    );`, page.ctx);
    for (const [input, expected] of [['p', 'P-'], ['P-5', 'P-5'], ['p5', 'P-5'], ['h-e', 'HE'], ['hernan cortes', 'HERNAN CORTES'], ['jose lopez', 'JOSE LOPEZ'], ['2026', '2026']]) {
        field.value = input;
        field.handlers.input({inputType: 'insertText'});
        assert.equal(field.value, expected);
        assert.equal(vm.runInContext('getOrdenesFiltradas().length', page.ctx), input === 'p' ? 2 : 1);
        assert.equal(vm.runInContext('getOrdenesFiltradas()[0].numero', page.ctx), 2026);
    }
    field.value = 'P'; field.handlers.input({inputType: 'deleteContentBackward'});
    assert.equal(field.value, 'P');
    field.value = ''; field.handlers.input({inputType: 'deleteContentBackward'});
    assert.equal(vm.runInContext('getOrdenesFiltradas().length', page.ctx), 2);
    page.nodes.get('filtroEstadoOrdenTrabajo').value = 'Finalizada';
    assert.equal(vm.runInContext('getOrdenesFiltradas()[0].numero', page.ctx), 99);
});


test('Placa autocompleta vehiculo y cliente sin cambiar los campos manuales', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    vm.runInContext("catalogoVehiculos.push(mapVehiculoCatalogo({placa:'P-123ABC', modelo:'2026', marca:'Toyota', cliente:'Ana Perez', tipo:'Sedan', kilometraje:100})); renderOrdenDatalists();", page.ctx);
    assert(page.nodes.get('ordenPlacasList').innerHTML.includes('P-123ABC'));
    for (const [id, value] of [['ordenMecanico', 'Luis'], ['ordenKilometraje', '120'], ['ordenProximoServicio', 'Revision manual']]) page.nodes.get(id).value = value;
    page.nodes.get('ordenPlaca').value = 'p123abc';
    page.nodes.get('ordenPlaca').handlers.input();
    for (const [id, expected] of [['ordenPlaca','P-123ABC'], ['ordenVehiculo','2026'], ['ordenMarca','Toyota'], ['ordenPiloto','Ana Perez'], ['ordenTipoVehiculo','Sedan'], ['ordenMecanico','Luis'], ['ordenKilometraje','120'], ['ordenProximoServicio','Revision manual']]) assert.equal(page.nodes.get(id).value, expected);
    page.nodes.get('ordenPlaca').value = '';
    page.nodes.get('ordenPlaca').handlers.change();
    assert.equal(page.nodes.get('ordenPiloto').value, '');
    assert.equal(page.nodes.get('ordenKilometraje').value, '120');
    assert.equal(page.nodes.has('ordenDepartamento'), false);
});


test('Campos automaticos bloqueados y casilla Pinchazo disponible al editar', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    const html = fs.readFileSync(path.join(__dirname, '../src/views/ordenes-trabajo.html'), 'utf8');
    for (const id of ['ordenVehiculo', 'ordenMarca', 'ordenPiloto']) assert(new RegExp('id="' + id + '"[^>]*readonly').test(html));
    for (const soloLectura of [true, false]) {
        vm.runInContext('setOrdenSoloLectura(' + soloLectura + ')', page.ctx);
        assert.equal(page.nodes.get('ordenTipoVehiculo').disabled, true);
    }
    vm.runInContext("setOrdenChecked('ordenManoPinchazo', true)", page.ctx);
    assert.equal(page.nodes.get('ordenManoPinchazo').checked, true);
});



test('Seleccion unica dentro del campo y servicio por cualquier palabra', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    const tipo = page.nodes.get('ordenTipoTrabajoBusqueda');
    tipo.value = 'Pinchazo'; tipo.handlers.change();
    assert.equal(page.nodes.get('ordenManoPinchazo').checked, true);
    tipo.value = 'Enderezado y Pintura'; tipo.handlers.change();
    assert.equal(page.nodes.get('ordenManoPinchazo').checked, false);
    assert.equal(tipo.value, 'Enderezado y Pintura');
    tipo.value = 'Mecanico'; tipo.handlers.change();
    const options = [{value:'7',textContent:'Cambio de aceite',dataset:{tipoTrabajo:'Mecanico'},selected:false}, {value:'8',textContent:'Revision de frenos',dataset:{tipoTrabajo:'Mecanico'},selected:false}];
    page.nodes.get('ordenServicios').options = options;
    const input = page.nodes.get('ordenServicioBusqueda');
    input.value = 'aceite'; input.handlers.input();
    assert(page.nodes.get('ordenServiciosSugeridos').innerHTML.includes('Cambio de aceite'));
    assert(!page.nodes.get('ordenServiciosSugeridos').innerHTML.includes('frenos'));
    input.value = 'Cambio de aceite'; input.handlers.change();
    assert.equal(options[0].selected, true); assert.equal(input.value,'Cambio de aceite');
    input.value = 'Revision de frenos'; input.handlers.change();
    assert.equal(options[0].selected, false); assert.equal(options[1].selected, true);
    assert.equal(page.nodes.has('ordenTiposSeleccionados'), false);
});

test('Buscador de repuestos muestra nombre y descripcion y conserva ID con descripciones iguales', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    vm.runInContext(`inventarioRepuestos.push(
        {id:7, codigo:'A1', nombre:'Filtro aceite', descripcion:'Para Toyota', existencia:3, costo:55},
        {id:8, codigo:'A2', nombre:'Filtro premium', descripcion:'Para Toyota', existencia:5, costo:65}
    ); renderOrdenDatalists()`, page.ctx);
    const lista = page.nodes.get('ordenRepuestosInventarioList').innerHTML;
    assert(lista.includes('Filtro aceite - Para Toyota (A1)'));
    assert(lista.includes('Filtro premium - Para Toyota (A2)'));
    const input = page.nodes.get('ordenRepuestoBusqueda');
    input.value = 'Filtro premium - Para Toyota (A2)'; input.handlers.input();
    assert.equal(input.value, 'Para Toyota');
    assert.equal(input.dataset.idRepuesto, '8');
    assert.equal(page.nodes.get('ordenRepuestoExistencia').value, '5 unidades');
    assert.equal(vm.runInContext('buscarRepuestoInventario(ordenRepuestoBusqueda.value).id', page.ctx), 8);
    input.value = 'Filtro aceite - Para Toyota (A1)'; input.handlers.input();
    assert.equal(input.value, 'Para Toyota');
    assert.equal(input.dataset.idRepuesto, '7');
    input.value = ''; input.handlers.input();
    assert.equal(input.dataset.idRepuesto, '');
    assert.equal(vm.runInContext("buscarRepuestoInventario('Para Toyota')", page.ctx), null);
});

test('Ingresos y salidas de repuestos muestran descripcion despues de seleccionar y conservan ID', async () => {
    const page = setup('repuestos'); await tick();
    vm.runInContext(`repuestos = [
        {id:7, codigo:'A1', nombre:'Filtro aceite', descripcion:'Para Toyota', existencia:3, costo:55},
        {id:8, codigo:'A2', nombre:'Filtro premium', descripcion:'Para Toyota', existencia:5, costo:65}
    ]; renderRepuestosList()`, page.ctx);
    assert(page.nodes.get('repuestosMovimientoList').innerHTML.includes('Filtro premium - Para Toyota (A2)'));
    const input = page.nodes.get('movimientoRepuesto');
    input.value = 'Filtro premium - Para Toyota (A2)'; input.handlers.input();
    assert.equal(input.value, 'Para Toyota');
    assert.equal(vm.runInContext('getRepuestoSeleccionado().id', page.ctx), 8);
    assert.equal(page.nodes.get('movimientoCosto').value, '65.00');
    page.nodes.get('formMovimientoRepuesto').handlers.reset();
    assert.equal(input.dataset.idRepuesto, '');
});

test('Cambiar el tipo filtra servicios y limpia una seleccion incompatible', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    const tipos = ['Mecanico', 'Electrico', 'Enderezado y Pintura', 'Pinchazo'];
    const opciones = tipos.map((tipo, index) => ({value: String(index + 1), textContent: 'Servicio ' + tipo, dataset:{tipoTrabajo:tipo}, selected:false}));
    page.nodes.get('ordenServicios').options = opciones;
    const tipo = page.nodes.get('ordenTipoTrabajoBusqueda');
    for (const nombre of tipos) {
        tipo.value = nombre; tipo.handlers.change();
        const html = page.nodes.get('ordenServicioSelector').innerHTML;
        for (const otro of tipos) assert.equal(html.includes('Servicio ' + otro), otro === nombre);
        const elegido = opciones.find(option => option.dataset.tipoTrabajo === nombre);
        assert.equal(opciones.some(option => option.selected), false);
        elegido.selected = true;
    }
});

test('Un servicio previamente seleccionado de otro tipo nunca se incluye en el desplegable', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    page.nodes.get('ordenServicios').options = [
        {value:'1', textContent:'Cambio de aceite', dataset:{tipoTrabajo:'Mecanico'}, selected:false},
        {value:'2', textContent:'Pintura general', dataset:{tipoTrabajo:'Enderezado y Pintura'}, selected:true}
    ];
    vm.runInContext('modoOrdenTrabajo = "edicion"; renderOpcionesTrabajo()', page.ctx);
    const selector = page.nodes.get('ordenServicioSelector');
    assert.equal(selector.disabled, true);
    assert(!selector.innerHTML.includes('Pintura general'));
    assert.equal(selector.value, '');
    const tipo = page.nodes.get('ordenTipoTrabajoBusqueda');
    tipo.value = 'Mecanico'; tipo.handlers.change();
    assert.equal(selector.disabled, false);
    assert(selector.innerHTML.includes('Cambio de aceite'));
    assert(!selector.innerHTML.includes('Pintura general'));
    tipo.value = ''; tipo.handlers.change();
    assert.equal(selector.disabled, true);
    assert(!selector.innerHTML.includes('Cambio de aceite'));
});

test('El filtro utiliza el tipo de trabajo del catalogo y conserva Preventivo o Correctivo', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    page.ctx.window.api.servicios.list = async () => [
        {id:1, nombre:'Cambio de aceite', tipo:'Preventivo', tipoTrabajo:'Mecanico'},
        {id:2, nombre:'Pintura general', tipo:'Correctivo', tipoTrabajo:'Enderezado y Pintura'}
    ];
    await vm.runInContext('cargarDatosOrdenes()', page.ctx);
    const tipo = page.nodes.get('ordenTipoTrabajoBusqueda');
    tipo.value = 'Mecanico'; tipo.handlers.change();
    assert(page.nodes.get('ordenServicioSelector').innerHTML.includes('Cambio de aceite'));
    assert(!page.nodes.get('ordenServicioSelector').innerHTML.includes('Pintura general'));
    tipo.value = 'Enderezado y Pintura'; tipo.handlers.change();
    assert(page.nodes.get('ordenServicioSelector').innerHTML.includes('Pintura general'));
    assert(!page.nodes.get('ordenServicioSelector').innerHTML.includes('Cambio de aceite'));
});

test('Proximo kilometraje y kilometraje del vehiculo alertan mientras se escribe y se limpian al corregir', async () => {
    const orden = setup('ordenes-trabajo'); await tick();
    orden.nodes.get('ordenKilometraje').value = '54851';
    const proximo = orden.nodes.get('ordenProximoServicio');
    proximo.value = '54000'; proximo.handlers.input();
    assert.match(proximo.validationMessage, /menor.*54851/);
    assert.match(orden.nodes.get('ordenKmValidacion').textContent, /menor/);
    for (const value of ['54851', '60000', 'Cambio de aceite en 5,000 km', '']) {
        proximo.value = value; proximo.handlers.input(); assert.equal(proximo.validationMessage, '');
    }
    const vehiculo = setup('vehiculos'); await tick();
    vm.runInContext('vehiculos = [{id:9, kilometraje:54851}]; vehiculoSeleccionadoId = 9', vehiculo.ctx);
    const km = vehiculo.nodes.get('vehiculoKilometraje');
    km.value = '54000'; km.handlers.input(); assert.match(km.validationMessage, /menor.*54851/);
    km.value = '54851'; km.handlers.input(); assert.equal(km.validationMessage, '');
});


test('Acciones de estado cancelan o avanzan sin perder los datos de la orden', async () => {
    const page = setup('ordenes-trabajo'); await tick();
    let orden = {id:42, numero:'42', estado:'Activa', trabajos:'Detalle conservado', kilometraje:200, servicios:[7]};
    let writes = 0;
    page.ctx.window.api.ordenes.list = async () => [orden];
    page.ctx.window.api.ordenes.update = async (id, value) => { assert.equal(id,42); writes++; orden=value; };
    page.ctx.botonPrueba = {dataset:{id:'42'},disabled:false};
    await vm.runInContext('avanzarEstadoOrden(botonPrueba)',page.ctx);
    assert.equal(writes,0);
    page.ctx.window.ui.confirm = async () => true;
    await vm.runInContext('avanzarEstadoOrden(botonPrueba)',page.ctx);
    assert.equal(orden.estado,'En proceso');
    await vm.runInContext('avanzarEstadoOrden(botonPrueba)',page.ctx);
    assert.equal(orden.estado,'Finalizada');
    assert.match(orden.fechaSalida,/^\d{4}-\d{2}-\d{2}$/);
    assert.equal(orden.trabajos,'Detalle conservado');
    assert.equal(orden.kilometraje,200);
    await vm.runInContext('avanzarEstadoOrden(botonPrueba)',page.ctx);
    assert.equal(orden.estado,'Entregado');
    assert.equal(writes,3);
    await vm.runInContext('avanzarEstadoOrden(botonPrueba)',page.ctx);
    assert.equal(writes,3);
});

test('Mecanicos muestra tabla, abre consulta y edicion, y limpia el formulario nuevo', async () => {
    const page = setup('mecanicos'); await tick();
    page.state.data = [{id_mecanico: 9, nombre: 'Ana', edad: 30, dpi: '1234567890123', correo: 'ana@example.com', direccion: 'Zona 1', fecha_contratacion: '2026-01-01', fecha_registro: '2026-01-01 08:00:00'}];
    await vm.runInContext('cargarMecanicos()', page.ctx);
    assert.equal(page.nodes.get('tablaMecanicos').children.length, 1);
    vm.runInContext("abrirMecanico(mecanicos[0], 'vista')", page.ctx);
    assert.equal(page.nodes.get('mecanico_nombre').disabled, true);
    assert.equal(page.nodes.get('mecanicoGuardar').hidden, true);
    vm.runInContext("abrirMecanico(mecanicos[0], 'edicion')", page.ctx);
    assert.equal(page.nodes.get('mecanico_nombre').value, 'Ana');
    assert.equal(page.nodes.get('mecanico_nombre').disabled, false);
    assert.equal(page.nodes.get('mecanicoGuardar').hidden, false);
    vm.runInContext('abrirMecanico()', page.ctx);
    assert.equal(page.nodes.get('mecanico_nombre').value, '');
    assert.equal(vm.runInContext('mecanicoId', page.ctx), null);
    let deleted = false;
    page.ctx.window.api.mecanicos.remove = async () => { deleted = true; };
    page.ctx.testButton = {disabled:false};
    await vm.runInContext('eliminarMecanico(mecanicos[0], testButton)', page.ctx);
    assert.equal(deleted, false);
    page.ctx.window.ui.confirm = async () => true;
    await vm.runInContext('eliminarMecanico(mecanicos[0], testButton)', page.ctx);
    assert.equal(deleted, true);
});

test('Indicadores de mecanicos cuentan por ID, incluyen cero y conservan el filtro al recargar', async () => {
    const page = setup('mecanicos'); await tick();
    page.ctx.window.api.mecanicos.list = async () => [
        {id_mecanico: 1, nombre: 'Ana', dpi: '1', correo: ''},
        {id_mecanico: 2, nombre: 'Ana', dpi: '2', correo: ''},
        {id_mecanico: 3, nombre: 'Luis', dpi: '3', correo: ''}
    ];
    page.ctx.window.api.ordenes.list = async () => [
        {idMecanico: 1, estado: 'Activa'}, {idMecanico: 1, estado: 'Entregado'}, {idMecanico: 2}, {idMecanico: null}
    ];
    await vm.runInContext('cargarMecanicos()', page.ctx);
    assert.equal(page.nodes.get('totalOrdenesMecanicos').textContent, 4);
    const filtro = page.nodes.get('filtroMecanicoOrdenes');
    filtro.value = '1'; filtro.handlers.change();
    assert.equal(page.nodes.get('totalOrdenesMecanicos').textContent, 2);
    assert.equal(page.nodes.get('ordenesMecanicoSeleccionado').textContent, 2);
    assert.equal(page.nodes.get('nombreMecanicoIndicador').textContent, 'Ana');
    await vm.runInContext('cargarMecanicos()', page.ctx);
    assert.equal(filtro.value, '1');
    filtro.value = '3'; filtro.handlers.change();
    assert.equal(page.nodes.get('ordenesMecanicoSeleccionado').textContent, 0);
    assert.equal(page.nodes.get('nombreMecanicoIndicador').textContent, 'Luis');
    page.ctx.window.api.ordenes.list = async () => { throw Error('Sin conexion'); };
    await vm.runInContext('cargarMecanicos()', page.ctx);
    assert.equal(page.nodes.get('totalOrdenesMecanicos').textContent, '--');
    assert.equal(filtro.disabled, true);
});
