// Capa de datos incremental para fase 2.
// No modifica los flujos existentes de vehiculos ni ordenes de trabajo.

function createMaintenanceLayer(pool) {
    function emptyToNull(value) {
        return value === '' || value === undefined ? null : value;
    }

    async function listPropietarios() {
        const [rows] = await pool.query(`
            SELECT id_propietario, tipo_persona, nombre, identificacion, telefono,
                   correo, direccion, contacto_empresa, estado
            FROM propietarios
            ORDER BY nombre ASC
        `);
        return rows.map((row) => ({
            id: row.id_propietario,
            tipoPersona: row.tipo_persona,
            nombre: row.nombre,
            identificacion: row.identificacion,
            telefono: row.telefono,
            correo: row.correo,
            direccion: row.direccion,
            contactoEmpresa: row.contacto_empresa,
            estado: row.estado
        }));
    }

    async function createPropietario(propietario) {
        const [result] = await pool.execute(`
            INSERT INTO propietarios (
                tipo_persona, nombre, identificacion, telefono, correo, direccion,
                contacto_empresa, estado, fecha_creacion, fecha_actualizacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            propietario.tipoPersona === 'Empresa' ? 'Empresa' : 'Individual',
            propietario.nombre,
            emptyToNull(propietario.identificacion),
            propietario.telefono,
            emptyToNull(propietario.correo),
            emptyToNull(propietario.direccion),
            emptyToNull(propietario.contactoEmpresa),
            propietario.estado || 'Activo'
        ]);
        return result.insertId;
    }

    async function listServicios() {
        const [rows] = await pool.query(`
            SELECT id_servicio, nombre, descripcion, tipo, intervalo_dias_normal,
                   intervalo_km_referencial, estado
            FROM servicios
            WHERE estado = 'Activo'
            ORDER BY nombre ASC
        `);
        return rows.map((row) => ({
            id: row.id_servicio,
            nombre: row.nombre,
            descripcion: row.descripcion,
            tipo: row.tipo,
            intervaloDiasNormal: row.intervalo_dias_normal,
            intervaloKmReferencial: row.intervalo_km_referencial,
            estado: row.estado
        }));
    }

    async function listAlertasMantenimiento() {
        const [rows] = await pool.query(`
            SELECT id_detalle_servicio, id_vehiculo, placa, propietario, servicio,
                   fecha_proximo_servicio, estado_alerta
            FROM vw_mantenimientos_alerta
            WHERE estado_alerta IN ('Proximo', 'Vencido')
            ORDER BY fecha_proximo_servicio ASC
        `);
        return rows.map((row) => ({
            idDetalleServicio: row.id_detalle_servicio,
            idVehiculo: row.id_vehiculo,
            placa: row.placa,
            propietario: row.propietario,
            servicio: row.servicio,
            fechaProximoServicio: row.fecha_proximo_servicio,
            estado: row.estado_alerta
        }));
    }

    return {
        listPropietarios,
        createPropietario,
        listServicios,
        listAlertasMantenimiento
    };
}

module.exports = { createMaintenanceLayer };
