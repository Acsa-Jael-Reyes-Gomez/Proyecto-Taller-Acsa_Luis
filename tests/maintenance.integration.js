// Ejecutar con node tests/maintenance.integration.js. Todas las escrituras se revierten.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { proximaFecha, kilometrajeValido } = require('../src/maintenance-rules');
async function main() {
    for (const value of [-1, NaN, Infinity, '', null, undefined]) assert.throws(() => kilometrajeValido(value));
    assert.equal(kilometrajeValido(0), 0);
    assert.equal(proximaFecha('2026-01-01', 100, 'Bajo'), '2026-05-06');
    assert.equal(proximaFecha('2026-01-01', 100, 'Normal'), '2026-04-11');
    assert.equal(proximaFecha('2026-01-01', 100, 'Alto'), '2026-03-17');
    const connection = await mysql.createConnection({ ...require('../src/db-config'), charset: 'UTF8_GENERAL_CI', dateStrings: true });
    try {
        const [engines] = await connection.query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('clientes','vehiculos','ordenes_trabajo','orden_repuestos','detalle_servicio','historial_kilometraje','servicios','recordatorios')");
        assert(engines.every(t => t.ENGINE === 'InnoDB'), 'Las pruebas requieren tablas transaccionales.');
        await connection.beginTransaction();
        // Los commits de la aplicacion se sustituyen por savepoints para revertir todo al final.
        const proxy = {
            execute: connection.execute.bind(connection), query: connection.query.bind(connection),
            beginTransaction: () => connection.query('SAVEPOINT app_test'),
            commit: async () => {}, rollback: () => connection.query('ROLLBACK TO SAVEPOINT app_test'), release: () => {}
        };
        const pool = { ...proxy, getConnection: async () => proxy };
        const mod = { exports: {} };
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/database.js'), 'utf8'), {
            module: mod, process, console,
            require: name => name === 'mysql2/promise' ? { createPool: () => pool } : require(path.join(__dirname, '../src', name))
        });
        const db = mod.exports;
        const [usuarios] = await connection.query("SELECT id_usuario FROM usuarios WHERE estado = 'Activo' LIMIT 1");
        assert(usuarios.length, 'Se requiere un usuario activo para la prueba');
        const idUsuario = usuarios[0].id_usuario;
        const crearVehiculoPrueba = datos => db.createVehiculo(datos, idUsuario);
        await assert.rejects(db.createVehiculo({}, undefined), /Inicia sesion/);
        const suffix = String(Date.now()).slice(-9);
        const mecanico = await db.saveMecanico(null, {nombre:'Mecanico prueba', edad:30, dpi:'8000'+suffix, correo:'prueba@example.com', direccion:'Direccion ficticia', fecha_contratacion:'2026-01-01'});
        assert(mecanico.fecha_registro);
        assert.equal((await db.checkMecanicoDpi(mecanico.dpi)).duplicado, true);
        assert.equal((await db.checkMecanicoDpi(mecanico.dpi, mecanico.id_mecanico)).duplicado, false);
        const mecanicoLibre = await db.saveMecanico(null, {...mecanico, dpi: '7000'+suffix});
        assert.equal(await db.deleteMecanico(mecanicoLibre.id_mecanico), true);
        await assert.rejects(db.deleteMecanico(mecanicoLibre.id_mecanico), /ya no existe/);
        const actualizadoMecanico = await db.saveMecanico(mecanico.id_mecanico, {...mecanico, edad:31});
        assert.equal(actualizadoMecanico.edad,31);
        assert.equal(actualizadoMecanico.fecha_registro,mecanico.fecha_registro);
        await assert.rejects(db.saveMecanico(null,{...mecanico,edad:0}),/edad/);
        await assert.rejects(db.saveMecanico(null,mecanico),/DPI/);
        assert((await db.listMecanicos()).some(m=>m.id_mecanico === mecanico.id_mecanico));

        const cliente = await db.createPiloto({ tipoPersona: 'Individual', nombre: 'Prueba ' + suffix,
            dpi: String(Date.now()), telefono: '5555-1234', correo: 'prueba@example.com',
            licencia: 'A-' + suffix, tipoLicencia: 'A', venceLicencia: '2030-12-31', direccion: 'Direccion de prueba',
            contactoEmpresa: 'Contacto prueba', estado: 'Activo' });
        assert.equal((await db.checkClienteDpi(cliente.dpi)).duplicado, true);
        assert.equal((await db.checkClienteDpi(cliente.dpi, cliente.id)).duplicado, false);
        assert.equal((await db.checkClienteDpi(' ' + cliente.dpi.slice(0,4) + '-' + cliente.dpi.slice(4))).duplicado, true);
        await assert.rejects(db.createPiloto({ ...cliente, nombre: 'Otro nombre' }), /DPI/);
        assert.equal(cliente.tipoPersona, 'Individual');
        assert.equal(cliente.contactoEmpresa, 'Contacto prueba');
        assert(cliente.fechaCreacion && cliente.fechaActualizacion);
        await assert.rejects(db.createPiloto({ ...cliente, nombre: '   ' }), /Completa/);
        const sinContacto = await db.updatePiloto(cliente.id, { ...cliente, contactoEmpresa: '' });
        assert.equal(sinContacto.contactoEmpresa, null);
        const [fechas] = await connection.query('SELECT CURDATE() AS hoy, DATE_SUB(CURDATE(), INTERVAL 1 DAY) AS ayer, DATE_ADD(CURDATE(), INTERVAL 1 DAY) AS manana');
        for (const [fecha, estado] of [[fechas[0].ayer, 'Inactivo'], [fechas[0].hoy, 'Activo'], [fechas[0].manana, 'Activo']]) {
            const actualizado = await db.updatePiloto(cliente.id, { ...cliente, venceLicencia: fecha, estado: estado === 'Activo' ? 'Inactivo' : 'Activo' });
            assert.equal(actualizado.estado, estado, 'El estado enviado se ignora');
            const [persistido] = await connection.execute('SELECT estado FROM clientes WHERE id_cliente = ?', [cliente.id]);
            assert.equal(persistido[0].estado, estado);
        }
        await connection.execute("UPDATE clientes SET vence_licencia = ?, estado = 'Activo' WHERE id_cliente = ?", [fechas[0].ayer, cliente.id]);
        assert.equal((await db.listPilotos()).find(c => c.id === cliente.id).estado, 'Inactivo', 'El listado actualiza estados vencidos');
        const [estadoActual] = await connection.execute('SELECT estado FROM clientes WHERE id_cliente = ?', [cliente.id]);
        assert.equal(estadoActual[0].estado, 'Inactivo');
        const [columnas] = await connection.query('SHOW COLUMNS FROM clientes');
        assert(!columnas.some(c => ['identificacion', 'emergencia'].includes(c.Field)));
        const editado = await db.updatePiloto(cliente.id, { ...cliente, tipoPersona: 'Empresa', contactoEmpresa: 'Representante actualizado' });
        assert.equal(editado.tipoPersona, 'Empresa');
        assert.equal(editado.contactoEmpresa, 'Representante actualizado');
        const [fila] = await connection.execute('SELECT * FROM clientes WHERE id_cliente = ?', [cliente.id]);
        assert(!Object.hasOwn(fila[0], 'placa_vehiculo'), 'La relacion se almacena en vehiculos');
        assert((await db.listPilotos()).some(c => c.id === cliente.id && c.tipoPersona === 'Empresa'));
        await assert.rejects(crearVehiculoPrueba({ placa: 'Z-' + suffix, propietario: 'Cliente inexistente ' + suffix, kilometraje: 0 }), /Registra primero/);
        let v = await crearVehiculoPrueba({ idCliente: cliente.id, placa: 'T-' + suffix, propietario: 'Propietario manual ' + suffix, kilometraje: 100, marca: 'Prueba', modelo: 'Modelo', tipo: 'Camion', nivelUso: 'Alto' });
        assert(v.idCliente);
        const desactivado = await db.setEstadoVehiculo(v.id, 'Inactivo');
        assert.equal(desactivado.estado, 'Inactivo');
        assert.equal(desactivado.modelo, v.modelo);
        assert.equal(desactivado.creadoPor, idUsuario);
        assert.equal((await db.listVehiculos()).find(item => item.id === v.id).estado, 'Inactivo');
        assert.equal((await db.setEstadoVehiculo(v.id, 'Activo')).estado, 'Activo');
        await assert.rejects(db.setEstadoVehiculo(v.id, 'Otro'), /invalido/);
        assert.equal(v.propietario, 'Propietario manual ' + suffix);
        assert.equal(v.cliente, cliente.nombre);
        const [propietarioGuardado] = await connection.execute('SELECT propietario FROM vehiculos WHERE id_vehiculo = ?', [v.id]);
        assert.equal(propietarioGuardado[0].propietario, v.propietario);
        assert.equal((await db.listVehiculos()).find(item => item.id === v.id).propietario, v.propietario);
        await assert.rejects(db.updateVehiculo(v.id, { ...v, propietario: '   ' }), /Indica el propietario/);
        assert.equal(v.modelo, 'Modelo');
        assert.equal(v.creadoPor, idUsuario);
        const [camposVehiculo] = await connection.query('SHOW COLUMNS FROM vehiculos');
        assert(!camposVehiculo.some(c => ['no_tarjeta', 'modelo_registro', 'anio', 'fecha_registro', 'observaciones', 'piloto'].includes(c.Field)));
        assert(camposVehiculo.some(c => c.Field === 'modelo'));
        const segundo = await crearVehiculoPrueba({ idCliente: cliente.id, placa: 'S-' + suffix, propietario: 'Segundo propietario', kilometraje: 0, marca: 'Prueba', modelo: 'Segundo', tipo: 'Camion' });
        assert.equal(segundo.idCliente, cliente.id);
        const propietarioConVehiculos = (await db.listPilotos()).find(c => c.id === cliente.id);
        assert.equal(propietarioConVehiculos.vehiculos.length, 2);
        assert(propietarioConVehiculos.vehiculos.some(item => item.id === v.id));
        assert(propietarioConVehiculos.vehiculos.some(item => item.id === segundo.id));
        const editadoConVehiculos = await db.updatePiloto(cliente.id, { ...editado, contactoEmpresa: null });
        assert.equal(editadoConVehiculos.vehiculos.length, 2, 'Editar propietario conserva sus vehiculos');
        await assert.rejects(db.updateVehiculo(v.id, { ...v, kilometraje: 99 }), /menor/);
        const [sr] = await connection.execute("INSERT INTO servicios(nombre, tipo, intervalo_dias_normal, intervalo_km_referencial, estado) VALUES (?, 'Preventivo', 100, 5000, 'Activo')", ['Prueba ' + suffix]);
        await connection.execute('UPDATE servicios SET tipo_vehiculo = ? WHERE id_servicio = ?', ['Camion', sr.insertId]);
        // Seleccion directa del tipo sin confundirlo con Preventivo/Correctivo.
        await connection.execute('INSERT INTO servicios_tipos_vehiculo (id_servicio,tipo_vehiculo) VALUES (?, ?)', [sr.insertId, 'Camion']);
        assert((await db.listServicios('Camion')).some(s => s.id === sr.insertId));
        assert(!(await db.listServicios('Moto')).some(s => s.id === sr.insertId));
        assert((await db.listServicios()).some(s => s.id === sr.insertId));
        await assert.rejects(connection.execute('INSERT INTO servicios_tipos_vehiculo (id_servicio,tipo_vehiculo) VALUES (?, ?)', [sr.insertId, 'Camion']), error => error.code === 'ER_DUP_ENTRY');
        await assert.rejects(connection.execute('INSERT INTO servicios_tipos_vehiculo (id_servicio,tipo_vehiculo) VALUES (?, ?)', [sr.insertId, 'Tipo inexistente']), error => error.code === 'ER_NO_REFERENCED_ROW_2');
        await assert.rejects(connection.execute('UPDATE vehiculos SET tipo = ? WHERE id_vehiculo = ?', ['Tipo inexistente', v.id]), error => error.code === 'ER_NO_REFERENCED_ROW_2');
        await assert.rejects(connection.execute('DELETE FROM tipos_vehiculo WHERE tipo = ?', ['Camion']), error => error.code === 'ER_ROW_IS_REFERENCED_2');
        let o = await db.createOrden({ idMecanico: mecanico.id_mecanico, numero: 'T' + suffix, placa: v.placa, fechaEntrada: '2026-01-01', horaEntrada: '08:00', kilometraje: 100, estado: 'Abierta', manoPinchazo: true, servicios: [sr.insertId] });
        assert.equal(o.idVehiculo, v.id);
        const [h] = await connection.query('SELECT COUNT(*) AS n FROM historial_kilometraje WHERE id_vehiculo = ?', [v.id]);
        assert.equal(h[0].n, 2);
        assert.equal(o.idMecanico,mecanico.id_mecanico);
        assert.equal(o.mecanico,mecanico.nombre);
        assert.equal(o.manoPinchazo, true);
        await assert.rejects(db.createOrden({ ...o, numero: 'R' + suffix, kilometraje: 99 }), /menor/);
        const textoUnicode = 'Revisi\u00f3n el\u00e9ctrica, lubricaci\u00f3n y da\u00f1o: <pieza> & \"especial\"';
        o = await db.updateOrden(o.id, { ...o, trabajos: textoUnicode });
        assert.equal(o.trabajos, textoUnicode);
        o = await db.updateOrden(o.id, {...o, observaciones: '   '});
        assert.equal(o.observaciones, 'ninguna observacion');
        assert.equal((await db.listHistorial()).find(row => row.id_orden === o.id).observaciones, 'ninguna observacion');
        const [tipoHistorico] = await connection.execute('SELECT tipo_vehiculo FROM detalle_servicio WHERE id_orden = ?', [o.id]);
        assert.equal(tipoHistorico[0].tipo_vehiculo, 'Camion');
        await connection.execute('UPDATE servicios SET tipo_vehiculo = ? WHERE id_servicio = ?', ['Moto', sr.insertId]);
        const [tipoConservado] = await connection.execute('SELECT tipo_vehiculo FROM detalle_servicio WHERE id_orden = ?', [o.id]);
        assert.equal(tipoConservado[0].tipo_vehiculo, 'Camion');
        assert.equal((await db.listHistorial()).find(row => row.id_orden === o.id).tipoVehiculo, 'Camion');
        await connection.execute('UPDATE servicios SET tipo_vehiculo = ? WHERE id_servicio = ?', ['Camion', sr.insertId]);
        await assert.rejects(db.deleteMecanico(mecanico.id_mecanico), /ordenes vinculadas/);
        assert.equal((await db.checkOrdenIdentidad(o.numero, o.serie)).duplicado, true);
        assert.equal((await db.checkOrdenIdentidad(o.numero, o.serie, o.id)).duplicado, false);
        assert.equal((await db.checkOrdenIdentidad(o.numero, 'SERIE B')).duplicado, false);
        await assert.rejects(db.createOrden({ ...o }), /numero y serie/);
        await connection.query('SAVEPOINT identidad_test');
        const otraSerie = await db.createOrden({ ...o, serie: 'SERIE B', servicios: [], repuestos: [] });
        await assert.rejects(db.updateOrden(otraSerie.id, { ...otraSerie, serie: o.serie }), /numero y serie/);
        await connection.query('ROLLBACK TO SAVEPOINT identidad_test');
        o = await db.updateOrden(o.id, { ...o, estado: 'Finalizada', fechaSalida: '2026-01-01' });
        for (const checked of [true, false]) {
            o = await db.updateOrden(o.id, { ...o, manoMecanico: checked, manoElectronico: checked, manoPintura: checked, manoPinchazo: checked, piloto: 'No debe guardarse' });
            for (const field of ['manoMecanico', 'manoElectronico', 'manoPintura', 'manoPinchazo']) assert.equal(o[field], checked);
            assert.equal(o.piloto, cliente.nombre);
        }
        const [d] = await connection.query('SELECT * FROM detalle_servicio WHERE id_orden = ?', [o.id]);
        assert.equal(d[0].fecha_proximo_servicio, '2026-03-17');
        await db.updateOrden(o.id, { ...o, observaciones: 'Edicion sin duplicar historial' });
        const [h2] = await connection.query('SELECT COUNT(*) AS n FROM historial_kilometraje WHERE id_vehiculo = ?', [v.id]);
        assert.equal(h2[0].n, 2);
        v = await db.updateVehiculo(v.id, { ...v, kilometraje: 200, placa: 'X-' + suffix, creadoPor: -1, propietario: 'Propietario editado' });
        assert.equal(v.creadoPor, idUsuario, 'Editar no modifica el autor original');
        assert.equal(v.propietario, 'Propietario editado');
        assert.equal(v.idCliente, cliente.id);
        assert.equal(v.cliente, cliente.nombre);
        assert.equal(v.modelo, 'Modelo');
        await db.updateOrden(o.id, { ...o, observaciones: 'Edicion historica con kilometraje actual mayor' });
        const [historica] = await connection.query('SELECT placa FROM ordenes_trabajo WHERE id_orden = ?', [o.id]);
        assert.equal(historica[0].placa, 'T-' + suffix);
        for (const [dias, estado] of [[8, 'Programado'], [7, 'Proximo'], [0, 'Proximo'], [-1, 'Vencido']]) {
            await connection.query('UPDATE detalle_servicio SET fecha_proximo_servicio = DATE_ADD(CURDATE(), INTERVAL ? DAY) WHERE id_detalle_servicio = ?', [dias, d[0].id_detalle_servicio]);
            const [alerta] = await connection.query('SELECT * FROM vw_mantenimientos_alerta WHERE id_detalle_servicio = ?', [d[0].id_detalle_servicio]);
            assert.equal(alerta[0].estado_alerta, estado);
            assert.equal(alerta[0].placa, v.placa);
            await db.generarRecordatorios();
        }
        await db.generarRecordatorios();
        const [r] = await connection.query('SELECT COUNT(*) AS n FROM recordatorios WHERE id_detalle_servicio = ?', [d[0].id_detalle_servicio]);
        assert.equal(r[0].n, 2);
        const dash = await db.dashboard(); assert(dash.vehiculos >= 1); assert(dash.enTaller >= 1);
        await connection.query('SAVEPOINT indicador_taller');
        for (const estado of ['Activa', 'En proceso', 'Finalizada', 'Entregado']) {
            await connection.execute('UPDATE ordenes_trabajo SET estado = ? WHERE id_orden = ?', [estado, o.id]);
            assert.equal(Number((await db.dashboard()).enTaller), Number(dash.enTaller) - (estado === 'Entregado' ? 1 : 0));
        }
        await connection.query('ROLLBACK TO SAVEPOINT indicador_taller');
        const alertaKm = dash.servicios.find(s => s.id_detalle_servicio === d[0].id_detalle_servicio);
        assert.equal(alertaKm.dias_restantes, -1);
        assert.equal(alertaKm.estado_alerta, 'Servicio pasado');
        assert(Number(alertaKm.kilometraje_actual) >= 200);
        if (alertaKm.kilometraje_proximo != null) assert.equal(alertaKm.kilometros_restantes, Number(alertaKm.kilometraje_proximo)-Number(alertaKm.kilometraje_actual));

        let o2 = await db.createOrden({ ...o, numero: 'N' + suffix, placa: v.placa, kilometraje: 200, fechaEntrada: '2026-02-01', fechaSalida: '2026-02-01' });
        assert.equal(o2.estado, 'Activa');
        o2 = await db.updateOrden(o2.id, { ...o2, estado: 'Finalizada' });
        assert(o2.id !== o.id);
        const [old] = await connection.query('SELECT * FROM vw_mantenimientos_alerta WHERE id_detalle_servicio = ?', [d[0].id_detalle_servicio]);
        assert.equal(old.length, 0, 'Una nueva atencion sustituye la alerta anterior');
        await assert.rejects(db.deletePiloto(cliente.id), /vehiculos vinculados/);
        await assert.rejects(db.deleteVehiculo(v.id), /ordenes de trabajo/);
        assert.equal(await db.deleteVehiculo(segundo.id), true);
        const [historialEliminado] = await connection.execute('SELECT * FROM historial_kilometraje WHERE id_vehiculo = ?', [segundo.id]);
        assert.equal(historialEliminado.length, 0);
        await assert.rejects(db.deleteVehiculo(segundo.id), /ya no existe/);
        const libre = await db.createPiloto({ ...cliente, dpi: '9' + suffix, licencia: 'L-' + suffix });
        const conHistorial = await crearVehiculoPrueba({ idCliente: libre.id, placa: 'H-' + suffix, propietario: libre.nombre, kilometraje: 10, modelo: '2026', tipo: 'Sedan' });
        await db.updateVehiculo(conHistorial.id, { ...conHistorial, kilometraje: 20 });
        await assert.rejects(db.deleteVehiculo(conHistorial.id), /historial de kilometraje/);
        const sinVehiculos = await db.createPiloto({ ...cliente, dpi: '8' + suffix, licencia: 'E-' + suffix });
        assert.equal(await db.deletePiloto(sinVehiculos.id), true);
        await assert.rejects(db.deletePiloto(sinVehiculos.id), /ya no existe/);
        await assert.rejects(db.deleteVehiculo(-1), /registro valido/);
        await assert.rejects(db.deletePiloto('1'), /registro valido/);
        const [pieza] = await connection.execute("INSERT INTO inventario_repuestos (codigo,nombre,existencia,precio_unitario,estado,fecha_creacion,fecha_actualizacion) VALUES (?, 'Pieza prueba', 10, 25, 'Activo', NOW(), NOW())", ['PX'+suffix]);
        const repuestoPrueba = {idRepuesto:pieza.insertId,nombre:'Pieza prueba',cantidad:3,costo:25};
        const existenciaPrueba = async () => Number((await connection.execute('SELECT existencia FROM inventario_repuestos WHERE id_repuesto=?',[pieza.insertId]))[0][0].existencia);
        const movimientosPrueba = async () => Number((await connection.execute('SELECT COUNT(*) n FROM repuestos_movimientos WHERE id_repuesto=?',[pieza.insertId]))[0][0].n);
        let consumo = await db.createOrden({...o,numero:'P'+suffix,placa:v.placa,estado:'Abierta',kilometraje:200,servicios:[],repuestos:[repuestoPrueba]});
        assert.equal(await existenciaPrueba(),7);
        assert.equal(await movimientosPrueba(),1);
        consumo = await db.updateOrden(consumo.id,consumo);
        assert.equal(await existenciaPrueba(),7);
        assert.equal(await movimientosPrueba(),1);
        consumo = await db.updateOrden(consumo.id,{...consumo,repuestos:[{...repuestoPrueba,cantidad:5}]});
        assert.equal(await existenciaPrueba(),5);
        consumo = await db.updateOrden(consumo.id,{...consumo,repuestos:[{...repuestoPrueba,cantidad:2}]});
        assert.equal(await existenciaPrueba(),8);
        await assert.rejects(db.updateOrden(consumo.id,{...consumo,repuestos:[{...repuestoPrueba,cantidad:99}]}),/insuficiente/);
        assert.equal(await existenciaPrueba(),8);
        assert.equal(await movimientosPrueba(),3);
        await db.deleteOrden(consumo.id);
        assert.equal(await existenciaPrueba(),10);
        assert.equal(await movimientosPrueba(),4);
        // Una orden historica sin descuento no genera devoluciones ficticias.
        const antigua = await db.createOrden({...o,numero:'L'+suffix,placa:v.placa,estado:'Abierta',kilometraje:200,servicios:[],repuestos:[]});
        await connection.execute('INSERT INTO orden_repuestos (id_orden,id_repuesto,nombre,cantidad,precio_unitario,subtotal,cantidad_descontada) VALUES (?,?,?,3,25,75,0)',[antigua.id,pieza.insertId,'Pieza prueba']);
        await db.deleteOrden(antigua.id);
        assert.equal(await existenciaPrueba(),10);
        assert.equal(await movimientosPrueba(),4);
        const [antesKm] = await connection.execute('SELECT * FROM vehiculos WHERE id_vehiculo=?',[v.id]);
        await db.actualizarKilometraje(v.id,250);
        await db.actualizarKilometraje(v.id,250);
        await assert.rejects(db.actualizarKilometraje(v.id,249),/menor/);
        const [despuesKm] = await connection.execute('SELECT * FROM vehiculos WHERE id_vehiculo=?',[v.id]);
        assert.equal(Number(despuesKm[0].kilometraje),250);
        assert.equal(despuesKm[0].modelo,antesKm[0].modelo);
        assert.equal(despuesKm[0].estado,antesKm[0].estado);
        const [historiaKm] = await connection.execute('SELECT COUNT(*) n FROM historial_kilometraje WHERE id_vehiculo=? AND kilometraje=250',[v.id]);
        assert.equal(Number(historiaKm[0].n),1);
        const historial = await db.listHistorial();
        const primeraAtencion = historial.find(row => row.id_orden === o.id);
        const siguienteAtencion = historial.find(row => row.id_orden === o2.id);
        assert(primeraAtencion && siguienteAtencion, 'Una atencion nueva conserva la anterior');
        assert.equal(primeraAtencion.placa, 'T-' + suffix);
        assert.equal(primeraAtencion.mecanico, mecanico.nombre);
        assert.equal(primeraAtencion.fecha.slice(0,10), '2026-01-01');
        assert.equal(Number(primeraAtencion.kilometraje),100);
        assert.equal(primeraAtencion.servicios, 'Prueba ' + suffix);
        assert.equal(primeraAtencion.trabajos, textoUnicode);
        assert(historial.every(row => row.id_orden != null), 'El historial solo muestra ordenes, sin actualizaciones independientes de kilometraje');
        console.log('OK: relaciones, historial, mantenimiento, dashboard y eliminaciones de clientes y vehiculos.');
    } finally { await connection.rollback(); await connection.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
