const mysql = require('mysql2/promise');
const localConfig = require('./db-config');

const dbConfig = {
    host: process.env.DB_HOST || localConfig.host || '127.0.0.1',
    port: Number(process.env.DB_PORT || localConfig.port || 3306),
    user: process.env.DB_USER || localConfig.user || 'root',
    password: process.env.DB_PASSWORD || localConfig.password || '',
    database: process.env.DB_NAME || localConfig.database || 'taller_ttc',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
};

const pool = mysql.createPool(dbConfig);

function buildDatabaseError(error) {
    if (error && error.code === 'ER_ACCESS_DENIED_ERROR') {
        const passwordHint = dbConfig.password ? 'La contrasena configurada no fue aceptada.' : 'No hay contrasena configurada.';
        return new Error(`${passwordHint} Revisa src/db-config.js o las variables DB_USER y DB_PASSWORD para el usuario "${dbConfig.user}" en MySQL.`);
    }

    return error;
}

function emptyToNull(value) {
    return value === '' || value === undefined ? null : value;
}

function mapVehiculo(row) {
    return {
        id: row.id_vehiculo,
        placa: row.placa,
        noTarjeta: row.no_tarjeta,
        nit: row.nit,
        cui: row.cui,
        propietario: row.propietario,
        piloto: row.piloto,
        uso: row.uso,
        tipo: row.tipo,
        marca: row.marca,
        linea: row.linea,
        modelo: row.modelo,
        modeloRegistro: row.modelo_registro,
        color: row.color,
        chasis: row.chasis,
        serie: row.serie,
        vin: row.vin,
        motor: row.motor,
        asientos: row.asientos,
        ejes: row.ejes,
        cilindros: row.cilindros,
        cc: row.cc,
        tonelaje: row.tonelaje,
        kilometraje: row.kilometraje,
        estado: row.estado
    };
}

function mapPiloto(row) {
    return {
        id: row.id_piloto,
        nombre: row.nombre,
        dpi: row.dpi,
        nit: row.nit,
        telefono: row.telefono,
        correo: row.correo,
        licencia: row.licencia,
        tipoLicencia: row.tipo_licencia,
        venceLicencia: row.vence_licencia,
        estado: row.estado,
        vehiculo: row.vehiculo,
        direccion: row.direccion,
        emergencia: row.emergencia
    };
}

function mapRepuesto(row) {
    return {
        id: row.id_repuesto,
        codigo: row.codigo,
        nombre: row.nombre,
        descripcion: row.descripcion,
        existencia: Number(row.existencia) || 0,
        costo: Number(row.precio_unitario) || 0,
        estado: row.estado
    };
}

function mapRepuestoMovimiento(row) {
    return {
        id: row.id_movimiento,
        idRepuesto: row.id_repuesto,
        codigo: row.codigo,
        nombre: row.nombre,
        tipo: row.tipo,
        cantidad: Number(row.cantidad) || 0,
        existenciaAnterior: Number(row.existencia_anterior) || 0,
        existenciaNueva: Number(row.existencia_nueva) || 0,
        costo: Number(row.precio_unitario) || 0,
        referencia: row.referencia,
        observaciones: row.observaciones,
        fecha: row.fecha_movimiento
    };
}

function mapOrden(row) {
    return {
        id: row.id_orden,
        numero: row.numero,
        serie: row.serie,
        fechaEntrada: row.fecha_entrada,
        horaEntrada: row.hora_entrada ? String(row.hora_entrada).slice(0, 5) : '',
        periodoEntrada: row.periodo_entrada,
        fechaSalida: row.fecha_salida,
        horaSalida: row.hora_salida ? String(row.hora_salida).slice(0, 5) : '',
        periodoSalida: row.periodo_salida,
        vehiculo: row.vehiculo,
        placa: row.placa,
        piloto: row.piloto,
        marca: row.marca,
        mecanico: row.mecanico,
        departamento: row.departamento,
        kilometraje: row.kilometraje,
        proximoServicio: row.proximo_servicio,
        tipoVehiculo: row.tipo_vehiculo,
        estado: row.estado,
        manoMecanico: Boolean(row.mano_mecanico),
        manoElectronico: Boolean(row.mano_electronico),
        manoPintura: Boolean(row.mano_pintura),
        totalManoObra: Number(row.total_mano_obra) || 0,
        totalRepuestos: Number(row.total_repuestos) || 0,
        trabajos: row.trabajos,
        observaciones: row.observaciones,
        repuestos: []
    };
}

function mapOrdenRepuesto(row) {
    return {
        id: row.id_orden_repuesto,
        idRepuesto: row.id_repuesto,
        codigo: row.codigo,
        nombre: row.nombre,
        cantidad: Number(row.cantidad) || 1,
        cantidadTexto: row.cantidad_texto,
        costo: Number(row.precio_unitario) || 0,
        subtotal: Number(row.subtotal) || 0
    };
}

async function listVehiculos() {
    const [rows] = await pool.query('SELECT * FROM vehiculos ORDER BY id_vehiculo DESC');
    return rows.map(mapVehiculo);
}

async function createVehiculo(vehiculo) {
    const modelo = vehiculo.modelo || [vehiculo.marca, vehiculo.linea].filter(Boolean).join(' ') || vehiculo.modeloRegistro;
    const [result] = await pool.execute(`
        INSERT INTO vehiculos (
            placa, no_tarjeta, nit, cui, propietario, piloto, uso, tipo, marca, linea,
            modelo, modelo_registro, color, chasis, serie, vin, motor, asientos, ejes,
            cilindros, cc, tonelaje, kilometraje, estado, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
        vehiculo.placa, emptyToNull(vehiculo.noTarjeta), emptyToNull(vehiculo.nit), emptyToNull(vehiculo.cui),
        emptyToNull(vehiculo.propietario), emptyToNull(vehiculo.piloto), emptyToNull(vehiculo.uso),
        emptyToNull(vehiculo.tipo), emptyToNull(vehiculo.marca), emptyToNull(vehiculo.linea), emptyToNull(modelo),
        emptyToNull(vehiculo.modeloRegistro), emptyToNull(vehiculo.color), emptyToNull(vehiculo.chasis),
        emptyToNull(vehiculo.serie), emptyToNull(vehiculo.vin), emptyToNull(vehiculo.motor),
        Number(vehiculo.asientos) || 0, Number(vehiculo.ejes) || 0, Number(vehiculo.cilindros) || 0,
        Number(vehiculo.cc) || 0, Number(vehiculo.tonelaje) || 0, Number(vehiculo.kilometraje) || 0,
        vehiculo.estado || 'Activo'
    ]);
    return getVehiculo(result.insertId);
}

async function updateVehiculo(id, vehiculo) {
    const modelo = vehiculo.modelo || [vehiculo.marca, vehiculo.linea].filter(Boolean).join(' ') || vehiculo.modeloRegistro;
    await pool.execute(`
        UPDATE vehiculos SET
            placa = ?, no_tarjeta = ?, nit = ?, cui = ?, propietario = ?, piloto = ?, uso = ?, tipo = ?,
            marca = ?, linea = ?, modelo = ?, modelo_registro = ?, color = ?, chasis = ?, serie = ?,
            vin = ?, motor = ?, asientos = ?, ejes = ?, cilindros = ?, cc = ?, tonelaje = ?,
            kilometraje = ?, estado = ?, fecha_actualizacion = NOW()
        WHERE id_vehiculo = ?
    `, [
        vehiculo.placa, emptyToNull(vehiculo.noTarjeta), emptyToNull(vehiculo.nit), emptyToNull(vehiculo.cui),
        emptyToNull(vehiculo.propietario), emptyToNull(vehiculo.piloto), emptyToNull(vehiculo.uso),
        emptyToNull(vehiculo.tipo), emptyToNull(vehiculo.marca), emptyToNull(vehiculo.linea), emptyToNull(modelo),
        emptyToNull(vehiculo.modeloRegistro), emptyToNull(vehiculo.color), emptyToNull(vehiculo.chasis),
        emptyToNull(vehiculo.serie), emptyToNull(vehiculo.vin), emptyToNull(vehiculo.motor),
        Number(vehiculo.asientos) || 0, Number(vehiculo.ejes) || 0, Number(vehiculo.cilindros) || 0,
        Number(vehiculo.cc) || 0, Number(vehiculo.tonelaje) || 0, Number(vehiculo.kilometraje) || 0,
        vehiculo.estado || 'Activo', id
    ]);
    return getVehiculo(id);
}

async function getVehiculo(id) {
    const [rows] = await pool.execute('SELECT * FROM vehiculos WHERE id_vehiculo = ?', [id]);
    return rows[0] ? mapVehiculo(rows[0]) : null;
}

async function deleteVehiculo(id) {
    await pool.execute('DELETE FROM vehiculos WHERE id_vehiculo = ?', [id]);
    return true;
}

async function listPilotos() {
    const [rows] = await pool.query('SELECT * FROM pilotos ORDER BY id_piloto DESC');
    return rows.map(mapPiloto);
}

async function createPiloto(piloto) {
    const [result] = await pool.execute(`
        INSERT INTO pilotos (
            nombre, dpi, nit, telefono, correo, licencia, tipo_licencia, vence_licencia,
            estado, vehiculo, direccion, emergencia, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
        piloto.nombre, emptyToNull(piloto.dpi), emptyToNull(piloto.nit), emptyToNull(piloto.telefono),
        emptyToNull(piloto.correo), emptyToNull(piloto.licencia), emptyToNull(piloto.tipoLicencia),
        emptyToNull(piloto.venceLicencia), piloto.estado || 'Activo', emptyToNull(piloto.vehiculo),
        emptyToNull(piloto.direccion), emptyToNull(piloto.emergencia)
    ]);
    return getPiloto(result.insertId);
}

async function updatePiloto(id, piloto) {
    await pool.execute(`
        UPDATE pilotos SET
            nombre = ?, dpi = ?, nit = ?, telefono = ?, correo = ?, licencia = ?, tipo_licencia = ?,
            vence_licencia = ?, estado = ?, vehiculo = ?, direccion = ?, emergencia = ?,
            fecha_actualizacion = NOW()
        WHERE id_piloto = ?
    `, [
        piloto.nombre, emptyToNull(piloto.dpi), emptyToNull(piloto.nit), emptyToNull(piloto.telefono),
        emptyToNull(piloto.correo), emptyToNull(piloto.licencia), emptyToNull(piloto.tipoLicencia),
        emptyToNull(piloto.venceLicencia), piloto.estado || 'Activo', emptyToNull(piloto.vehiculo),
        emptyToNull(piloto.direccion), emptyToNull(piloto.emergencia), id
    ]);
    return getPiloto(id);
}

async function getPiloto(id) {
    const [rows] = await pool.execute('SELECT * FROM pilotos WHERE id_piloto = ?', [id]);
    return rows[0] ? mapPiloto(rows[0]) : null;
}

async function deletePiloto(id) {
    await pool.execute('DELETE FROM pilotos WHERE id_piloto = ?', [id]);
    return true;
}

async function listRepuestos() {
    const [rows] = await pool.query('SELECT * FROM inventario_repuestos ORDER BY nombre ASC');
    return rows.map(mapRepuesto);
}

async function ensureRepuestosMovimientosTable(connection = pool) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS repuestos_movimientos (
            id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
            id_repuesto INT NOT NULL,
            codigo VARCHAR(50) NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            tipo ENUM('Ingreso', 'Salida') NOT NULL,
            cantidad DECIMAL(10, 2) NOT NULL,
            existencia_anterior DECIMAL(10, 2) NOT NULL DEFAULT 0,
            existencia_nueva DECIMAL(10, 2) NOT NULL DEFAULT 0,
            precio_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
            referencia VARCHAR(120) NULL,
            observaciones TEXT NULL,
            fecha_movimiento DATETIME NOT NULL,
            INDEX idx_repuestos_movimientos_repuesto (id_repuesto),
            INDEX idx_repuestos_movimientos_tipo_fecha (tipo, fecha_movimiento)
        )
    `);
}

async function getRepuesto(id, connection = pool) {
    const [rows] = await connection.execute('SELECT * FROM inventario_repuestos WHERE id_repuesto = ?', [id]);
    return rows[0] ? mapRepuesto(rows[0]) : null;
}

async function createRepuesto(repuesto) {
    const [result] = await pool.execute(`
        INSERT INTO inventario_repuestos (
            codigo, nombre, descripcion, existencia, precio_unitario, estado, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, 'Activo', NOW(), NOW())
    `, [
        repuesto.codigo,
        repuesto.nombre,
        emptyToNull(repuesto.descripcion),
        Number(repuesto.existencia) || 0,
        Number(repuesto.costo) || 0
    ]);

    return getRepuesto(result.insertId);
}

async function createRepuestoMovimiento(movimiento) {
    await ensureRepuestosMovimientosTable();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT * FROM inventario_repuestos WHERE id_repuesto = ? FOR UPDATE', [movimiento.idRepuesto]);
        const repuesto = rows[0] ? mapRepuesto(rows[0]) : null;

        if (!repuesto) {
            throw new Error('El repuesto seleccionado no existe.');
        }

        const cantidad = Number(movimiento.cantidad) || 0;

        if (cantidad <= 0) {
            throw new Error('La cantidad debe ser mayor que cero.');
        }

        const tipo = movimiento.tipo === 'Salida' ? 'Salida' : 'Ingreso';
        const existenciaAnterior = Number(repuesto.existencia) || 0;
        const existenciaNueva = tipo === 'Ingreso'
            ? existenciaAnterior + cantidad
            : existenciaAnterior - cantidad;

        if (existenciaNueva < 0) {
            throw new Error('No hay existencia suficiente para registrar la salida.');
        }

        const costo = Number(movimiento.costo || repuesto.costo) || 0;

        await connection.execute(`
            UPDATE inventario_repuestos
            SET existencia = ?, precio_unitario = ?, fecha_actualizacion = NOW()
            WHERE id_repuesto = ?
        `, [existenciaNueva, costo, repuesto.id]);

        const [result] = await connection.execute(`
            INSERT INTO repuestos_movimientos (
                id_repuesto, codigo, nombre, tipo, cantidad, existencia_anterior, existencia_nueva,
                precio_unitario, referencia, observaciones, fecha_movimiento
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            repuesto.id,
            repuesto.codigo,
            repuesto.nombre,
            tipo,
            cantidad,
            existenciaAnterior,
            existenciaNueva,
            costo,
            emptyToNull(movimiento.referencia),
            emptyToNull(movimiento.observaciones)
        ]);

        await connection.commit();
        return {
            id: result.insertId,
            repuesto: await getRepuesto(repuesto.id)
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function listRepuestoMovimientos() {
    await ensureRepuestosMovimientosTable();
    const [rows] = await pool.query('SELECT * FROM repuestos_movimientos ORDER BY fecha_movimiento DESC, id_movimiento DESC LIMIT 200');
    return rows.map(mapRepuestoMovimiento);
}

async function listUltimosIngresosRepuestos() {
    await ensureRepuestosMovimientosTable();
    const [rows] = await pool.query(`
        SELECT *
        FROM repuestos_movimientos
        WHERE tipo = 'Ingreso'
        ORDER BY fecha_movimiento DESC, id_movimiento DESC
        LIMIT 8
    `);
    return rows.map(mapRepuestoMovimiento);
}

async function listOrdenes() {
    const [ordenRows] = await pool.query('SELECT * FROM ordenes_trabajo ORDER BY id_orden DESC');
    const ordenes = ordenRows.map(mapOrden);

    if (ordenes.length === 0) {
        return ordenes;
    }

    const ids = ordenes.map((orden) => orden.id);
    const [repuestoRows] = await pool.query('SELECT * FROM orden_repuestos WHERE id_orden IN (?) ORDER BY id_orden_repuesto ASC', [ids]);
    const repuestosPorOrden = new Map();

    repuestoRows.forEach((row) => {
        const items = repuestosPorOrden.get(row.id_orden) || [];
        items.push(mapOrdenRepuesto(row));
        repuestosPorOrden.set(row.id_orden, items);
    });

    return ordenes.map((orden) => ({
        ...orden,
        repuestos: repuestosPorOrden.get(orden.id) || []
    }));
}

async function saveOrdenRepuestos(connection, idOrden, repuestos = []) {
    await connection.execute('DELETE FROM orden_repuestos WHERE id_orden = ?', [idOrden]);

    for (const repuesto of repuestos) {
        const cantidad = Number(repuesto.cantidad) || 1;
        const costo = Number(repuesto.costo) || 0;
        await connection.execute(`
            INSERT INTO orden_repuestos (
                id_orden, id_repuesto, codigo, nombre, cantidad, cantidad_texto, precio_unitario, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            idOrden, emptyToNull(repuesto.idRepuesto), emptyToNull(repuesto.codigo), repuesto.nombre,
            cantidad, emptyToNull(repuesto.cantidadTexto), costo, cantidad * costo
        ]);
    }
}

async function createOrden(orden) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const [result] = await connection.execute(`
            INSERT INTO ordenes_trabajo (
                numero, serie, fecha_entrada, hora_entrada, periodo_entrada, fecha_salida, hora_salida,
                periodo_salida, vehiculo, placa, piloto, marca, mecanico, departamento, kilometraje,
                proximo_servicio, tipo_vehiculo, estado, mano_mecanico, mano_electronico, mano_pintura,
                total_mano_obra, total_repuestos, trabajos, observaciones, fecha_creacion, fecha_actualizacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            orden.numero, orden.serie || 'Serie A', orden.fechaEntrada, orden.horaEntrada, orden.periodoEntrada || 'AM',
            emptyToNull(orden.fechaSalida), emptyToNull(orden.horaSalida), orden.periodoSalida || 'PM',
            emptyToNull(orden.vehiculo), orden.placa, emptyToNull(orden.piloto), emptyToNull(orden.marca),
            emptyToNull(orden.mecanico), emptyToNull(orden.departamento), Number(orden.kilometraje) || 0,
            emptyToNull(orden.proximoServicio), emptyToNull(orden.tipoVehiculo), orden.estado || 'Abierta',
            orden.manoMecanico ? 1 : 0, orden.manoElectronico ? 1 : 0, orden.manoPintura ? 1 : 0,
            Number(orden.totalManoObra) || 0, Number(orden.totalRepuestos) || 0,
            emptyToNull(orden.trabajos), emptyToNull(orden.observaciones)
        ]);

        await saveOrdenRepuestos(connection, result.insertId, orden.repuestos);
        await connection.commit();
        return getOrden(result.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updateOrden(id, orden) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        await connection.execute(`
            UPDATE ordenes_trabajo SET
                numero = ?, serie = ?, fecha_entrada = ?, hora_entrada = ?, periodo_entrada = ?,
                fecha_salida = ?, hora_salida = ?, periodo_salida = ?, vehiculo = ?, placa = ?,
                piloto = ?, marca = ?, mecanico = ?, departamento = ?, kilometraje = ?,
                proximo_servicio = ?, tipo_vehiculo = ?, estado = ?, mano_mecanico = ?,
                mano_electronico = ?, mano_pintura = ?, total_mano_obra = ?, total_repuestos = ?,
                trabajos = ?, observaciones = ?, fecha_actualizacion = NOW()
            WHERE id_orden = ?
        `, [
            orden.numero, orden.serie || 'Serie A', orden.fechaEntrada, orden.horaEntrada, orden.periodoEntrada || 'AM',
            emptyToNull(orden.fechaSalida), emptyToNull(orden.horaSalida), orden.periodoSalida || 'PM',
            emptyToNull(orden.vehiculo), orden.placa, emptyToNull(orden.piloto), emptyToNull(orden.marca),
            emptyToNull(orden.mecanico), emptyToNull(orden.departamento), Number(orden.kilometraje) || 0,
            emptyToNull(orden.proximoServicio), emptyToNull(orden.tipoVehiculo), orden.estado || 'Abierta',
            orden.manoMecanico ? 1 : 0, orden.manoElectronico ? 1 : 0, orden.manoPintura ? 1 : 0,
            Number(orden.totalManoObra) || 0, Number(orden.totalRepuestos) || 0,
            emptyToNull(orden.trabajos), emptyToNull(orden.observaciones), id
        ]);

        await saveOrdenRepuestos(connection, id, orden.repuestos);
        await connection.commit();
        return getOrden(id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getOrden(id) {
    const [rows] = await pool.execute('SELECT * FROM ordenes_trabajo WHERE id_orden = ?', [id]);
    if (!rows[0]) {
        return null;
    }

    const orden = mapOrden(rows[0]);
    const [repuestos] = await pool.execute('SELECT * FROM orden_repuestos WHERE id_orden = ? ORDER BY id_orden_repuesto ASC', [id]);
    orden.repuestos = repuestos.map(mapOrdenRepuesto);
    return orden;
}

async function deleteOrden(id) {
    await pool.execute('DELETE FROM ordenes_trabajo WHERE id_orden = ?', [id]);
    return true;
}

async function authenticateUser(usuario, password) {
    try {
        if (typeof usuario !== 'string' || typeof password !== 'string' || !usuario.trim() || !password) {
            return null;
        }

        const [rows] = await pool.execute(`
            SELECT id_usuario, usuario, nombre
            FROM usuarios
            WHERE usuario = ?
                AND password_hash = ?
                AND estado = 'Activo'
            LIMIT 1
        `, [usuario.trim(), password]);
        const user = rows[0];

        if (!user) {
            return null;
        }

        await pool.execute('UPDATE usuarios SET ultimo_acceso = NOW(), fecha_actualizacion = NOW() WHERE id_usuario = ?', [user.id_usuario]);

        return {
            id: user.id_usuario,
            usuario: user.usuario,
            nombre: user.nombre
        };
    } catch (error) {
        throw buildDatabaseError(error);
    }
}

module.exports = {
    authenticateUser,
    listVehiculos,
    createVehiculo,
    updateVehiculo,
    deleteVehiculo,
    listPilotos,
    createPiloto,
    updatePiloto,
    deletePiloto,
    listRepuestos,
    createRepuesto,
    createRepuestoMovimiento,
    listRepuestoMovimientos,
    listUltimosIngresosRepuestos,
    listOrdenes,
    createOrden,
    updateOrden,
    deleteOrden
};
