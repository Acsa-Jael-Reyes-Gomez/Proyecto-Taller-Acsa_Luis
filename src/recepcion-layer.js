function validarRecepcion(value = {}) {
    const data = {
        idVehiculo: Number(value.idVehiculo),
        idCliente: Number(value.idCliente),
        idMecanico: value.idMecanico ? Number(value.idMecanico) : null,
        kilometraje: Number(value.kilometraje),
        nivelUso: value.nivelUso,
        combustible: value.combustible,
        motivo: String(value.motivo || '').trim(),
        observaciones: String(value.observaciones || '').trim(),
        espejos: value.espejos === true,
        bateria: value.bateria === true,
        documentos: value.documentos === true
    };
    if (!Number.isInteger(data.idVehiculo) || data.idVehiculo <= 0) throw new Error('Selecciona un vehiculo.');
    if (!Number.isInteger(data.idCliente) || data.idCliente <= 0) throw new Error('Selecciona un cliente registrado.');
    if (data.idMecanico !== null && (!Number.isInteger(data.idMecanico) || data.idMecanico <= 0)) throw new Error('Mecanico invalido.');
    if (value.kilometraje === '' || value.kilometraje == null || !Number.isInteger(data.kilometraje) || data.kilometraje < 0 || data.kilometraje > 2147483647) throw new Error('Ingresa un kilometraje valido.');
    if (!['Bajo', 'Normal', 'Alto'].includes(data.nivelUso)) throw new Error('Perfil de uso invalido.');
    if (!['Vacio', '1/4', '1/2', '3/4', 'Lleno'].includes(data.combustible)) throw new Error('Selecciona el nivel de gasolina.');
    if (!data.motivo || data.motivo.length > 1000 || data.observaciones.length > 4000) throw new Error('Completa el motivo (maximo 1000 caracteres) y revisa las observaciones (maximo 4000).');
    return data;
}

function createRecepcionLayer(pool) {
    async function ensureTable() {
        await pool.query(`CREATE TABLE IF NOT EXISTS recepciones (
            id_recepcion INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            id_vehiculo INT NOT NULL, id_mecanico INT NULL, creado_por INT NOT NULL,
            fecha_ingreso DATETIME NOT NULL, placa VARCHAR(30) NOT NULL,
            cliente VARCHAR(255) NOT NULL, vehiculo VARCHAR(255) NOT NULL,
            mecanico VARCHAR(150) NULL, kilometraje INT NOT NULL,
            nivel_uso VARCHAR(10) NOT NULL, combustible VARCHAR(10) NOT NULL,
            espejos TINYINT NOT NULL, bateria TINYINT NOT NULL, documentos TINYINT NOT NULL,
            motivo TEXT NOT NULL, observaciones TEXT NOT NULL,
            INDEX idx_recepcion_vehiculo (id_vehiculo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
    }
    async function list() {
        await ensureTable();
        const [rows] = await pool.query('SELECT * FROM recepciones ORDER BY fecha_ingreso DESC, id_recepcion DESC');
        return rows;
    }
    async function get(id) {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) throw new Error('Recepcion invalida.');
        await ensureTable();
        const [rows] = await pool.execute('SELECT * FROM recepciones WHERE id_recepcion = ?', [Number(id)]);
        if (!rows.length) throw new Error('La recepcion no existe.');
        return rows[0];
    }
    async function create(value, userId) {
        if (!userId) throw new Error('Inicia sesion para registrar una recepcion.');
        const data = validarRecepcion(value);
        await ensureTable();
        if (value.fotos?.length) await ensureFotos();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [vehicles] = await connection.execute('SELECT v.*, c.nombre AS cliente FROM vehiculos v LEFT JOIN clientes c ON c.id_cliente = v.id_cliente WHERE v.id_vehiculo = ? FOR UPDATE', [data.idVehiculo]);
            const vehicle = vehicles[0];
            if (!vehicle) throw new Error('El vehiculo ya no existe.');
            if (value.fotos?.length && String(value.fotoPlaca || '').replace(/[\s-]/g,'').toUpperCase() !== String(vehicle.placa).replace(/[\s-]/g,'').toUpperCase()) throw new Error('Las fotos no corresponden al vehiculo de esta recepcion.');
            const [pendingOrders] = await connection.execute(`SELECT id_orden FROM ordenes_trabajo
                WHERE (id_vehiculo = ? OR (id_vehiculo IS NULL AND placa = ?))
                AND estado IN ('Espera', 'Activa', 'Abierta', 'En proceso', 'Finalizada') LIMIT 1 FOR UPDATE`, [data.idVehiculo, vehicle.placa]);
            if (pendingOrders.length) throw new Error('El vehiculo ya se encuentra en el taller con una orden pendiente de entrega.');
            if (data.kilometraje < Number(vehicle.kilometraje || 0)) throw new Error('El kilometraje no puede ser menor al registrado.');
            const [clients] = await connection.execute('SELECT nombre FROM clientes WHERE id_cliente = ? LOCK IN SHARE MODE', [data.idCliente]);
            if (!clients.length) throw new Error('El cliente ya no existe.');
            let mechanic = null;
            if (data.idMecanico) {
                const [rows] = await connection.execute('SELECT nombre FROM mecanicos WHERE id_mecanico = ? LOCK IN SHARE MODE', [data.idMecanico]);
                if (!rows.length) throw new Error('El mecanico ya no existe.');
                mechanic = rows[0].nombre;
            }
            const [result] = await connection.execute(`INSERT INTO recepciones
                (id_vehiculo, id_mecanico, creado_por, fecha_ingreso, placa, cliente, vehiculo, mecanico, kilometraje, nivel_uso, combustible, espejos, bateria, documentos, motivo, observaciones)
                VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.idVehiculo, data.idMecanico, userId, vehicle.placa, clients[0].nombre, [vehicle.marca, vehicle.linea, vehicle.modelo].filter(Boolean).join(' '), mechanic, data.kilometraje, data.nivelUso, data.combustible, Number(data.espejos), Number(data.bateria), Number(data.documentos), data.motivo, data.observaciones]);
            const numeroOrden = `REC-${result.insertId}`;
            for (const foto of value.fotos || []) {
                await connection.execute(`INSERT INTO recepcion_fotos
                    (id_recepcion, archivo, imagen, nombre, origen, creado_por, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [result.insertId, foto.archivo, foto.imagen, foto.nombre, foto.origen, userId]);
            }
            const [order] = await connection.execute(`INSERT INTO ordenes_trabajo
                (numero, serie, id_recepcion, id_vehiculo, fecha_entrada, hora_entrada, periodo_entrada,
                 vehiculo, placa, piloto, marca, mecanico, id_mecanico, kilometraje, tipo_vehiculo,
                 estado, trabajos, observaciones, creado_por, fecha_creacion, fecha_actualizacion)
                VALUES (?, 'RECEPCION', ?, ?, CURDATE(),
                    TIME_FORMAT(NOW(), '%h:%i:00'), IF(HOUR(NOW()) >= 12, 'PM', 'AM'),
                    ?, ?, ?, ?, ?, ?, ?, ?, 'Espera', ?, ?, ?, NOW(), NOW())`,
                [numeroOrden, result.insertId, data.idVehiculo, vehicle.modelo || null,
                 vehicle.placa, clients[0].nombre, vehicle.marca || null, mechanic, data.idMecanico,
                 data.kilometraje, vehicle.tipo || null, data.motivo, data.observaciones || null, userId]);
            await connection.execute(`INSERT INTO historial_kilometraje
                (id_vehiculo, id_orden, fecha_registro, kilometraje, origen, observaciones)
                VALUES (?, ?, NOW(), ?, 'Ingreso a taller', ?)`,
                [data.idVehiculo, order.insertId, data.kilometraje, `Recepcion #${result.insertId}`]);
            await connection.execute("UPDATE vehiculos SET estado = 'En taller', id_cliente = ?, kilometraje = ?, nivel_uso = ?, fecha_actualizacion = NOW() WHERE id_vehiculo = ?", [data.idCliente, data.kilometraje, data.nivelUso, data.idVehiculo]);
            await connection.commit();
            return { id: result.insertId, idOrden: order.insertId, numeroOrden };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    }
    let fotosTable;
    function ensureFotos() {
        if (!fotosTable) fotosTable = ensureTable().then(async () => {
            await pool.query(require('node:fs').readFileSync(require('node:path').join(__dirname, '../database/25-recepcion-fotos-mysql51.sql'), 'utf8'));
            const [columns] = await pool.query("SHOW COLUMNS FROM recepcion_fotos LIKE 'imagen'");
            if (!columns.length) await pool.query('ALTER TABLE recepcion_fotos ADD COLUMN imagen LONGBLOB NULL AFTER archivo');
            else if (columns[0].Type.toLowerCase() !== 'longblob') await pool.query('ALTER TABLE recepcion_fotos MODIFY COLUMN imagen LONGBLOB NULL');
        }).catch(error => { fotosTable = null; throw error; });
        return fotosTable;
    }
    async function listFotos(id) {
        await get(id);
        await ensureFotos();
        const [rows] = await pool.execute('SELECT * FROM recepcion_fotos WHERE id_recepcion = ? ORDER BY id_foto', [Number(id)]);
        return rows;
    }
    async function addFoto(id, foto) {
        await get(id);
        await ensureFotos();
        const [result] = await pool.execute(`INSERT INTO recepcion_fotos
            (id_recepcion, archivo, imagen, nombre, origen, creado_por, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [Number(id), foto.archivo, foto.imagen, foto.nombre, foto.origen, foto.userId]);
        return { id: result.insertId };
    }
    return { ensureTable, list, get, create, listFotos, addFoto };
}
module.exports = { createRecepcionLayer, validarRecepcion };
