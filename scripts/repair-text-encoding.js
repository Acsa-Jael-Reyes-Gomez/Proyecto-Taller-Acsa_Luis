// Ejecutar con --apply para reparar; sin argumentos solo cuenta los cambios.
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { repararTexto } = require('../src/text-encoding');

async function main() {
    const local = require('../src/db-config');
    const db = await mysql.createConnection({ ...local,
        host: process.env.DB_HOST || local.host,
        port: Number(process.env.DB_PORT || local.port || 3306),
        user: process.env.DB_USER || local.user,
        password: process.env.DB_PASSWORD || local.password,
        database: process.env.DB_NAME || local.database,
        charset: 'UTF8_GENERAL_CI'
    });
    const tablas = {
        ordenes_trabajo: ['vehiculo', 'piloto', 'marca', 'mecanico', 'departamento', 'trabajos', 'observaciones'],
        detalle_servicio: ['trabajo_realizado', 'observaciones'],
        servicios: ['nombre', 'descripcion'],
        clientes: ['nombre', 'direccion', 'contacto_empresa'],
        mecanicos: ['nombre', 'direccion'],
        vehiculos: ['propietario', 'marca', 'linea', 'modelo', 'color'],
        inventario_repuestos: ['nombre', 'descripcion'],
        historial_kilometraje: ['observaciones'],
        recordatorios: ['mensaje']
    };
    try {
        await db.beginTransaction();
        const cambios = [];
        for (const [tabla, campos] of Object.entries(tablas)) {
            const [columnas] = await db.query('SHOW COLUMNS FROM ??', [tabla]);
            const pk = columnas.find(col => col.Key === 'PRI')?.Field;
            const existentes = campos.filter(campo => columnas.some(col => col.Field === campo));
            if (!pk || !existentes.length) continue;
            const [rows] = await db.query('SELECT ?? FROM ?? FOR UPDATE', [[pk, ...existentes], tabla]);
            for (const row of rows) for (const campo of existentes) {
                const nuevo = repararTexto(row[campo]);
                if (nuevo !== row[campo]) cambios.push({ tabla, pk, id: row[pk], campo, anterior: row[campo], nuevo });
            }
        }
        if (process.argv.includes('--apply') && cambios.length) {
            const dir = path.join(__dirname, '../database/backups');
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, `19-textos-${Date.now()}.json`), JSON.stringify(cambios, null, 2), { flag: 'wx' });
            for (const cambio of cambios) {
                await db.query('UPDATE ?? SET ?? = ? WHERE ?? = ?', [cambio.tabla, cambio.campo, cambio.nuevo, cambio.pk, cambio.id]);
            }
            await db.commit();
            console.log(`Reparados ${cambios.length} campos. Copia previa en database/backups.`);
        } else {
            await db.rollback();
            console.log(`Campos recuperables: ${cambios.length}.`);
        }
    } catch (error) {
        await db.rollback();
        throw error;
    } finally { await db.end(); }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
