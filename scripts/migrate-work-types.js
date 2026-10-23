// Ejecutar con --apply. Guarda servicios y su esquema antes de aplicar la migracion 24.
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function main() {
    const local = require('../src/db-config');
    const connection = await mysql.createConnection({ ...local,
        host: process.env.DB_HOST || local.host, port: Number(process.env.DB_PORT || local.port || 3306),
        user: process.env.DB_USER || local.user, password: process.env.DB_PASSWORD || local.password,
        database: process.env.DB_NAME || local.database, charset: 'UTF8_GENERAL_CI', dateStrings: true
    });
    try {
        const [columns] = await connection.query('SHOW COLUMNS FROM servicios');
        if (columns.some(column => column.Field === 'id_tipo_trabajo')) {
            console.log('La migracion 24 ya esta aplicada.'); return;
        }
        if (!process.argv.includes('--apply')) {
            console.log('Migracion pendiente: cuatro tipos de trabajo y tres nuevos servicios. Ejecutar con --apply.'); return;
        }
        const [schema] = await connection.query('SHOW CREATE TABLE servicios');
        const [servicios] = await connection.query('SELECT * FROM servicios');
        const folder = path.join(__dirname, '../database/backups');
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(path.join(folder, `24-servicios-${Date.now()}.json`), JSON.stringify({ schema, servicios }, null, 2), { flag: 'wx' });
        const sql = fs.readFileSync(path.join(__dirname, '../database/24-tipos-trabajo-servicios-mysql51.sql'), 'utf8');
        for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await connection.query(statement);
        const [rows] = await connection.query('SELECT t.nombre AS tipoTrabajo, s.nombre AS servicio FROM tipos_trabajo t LEFT JOIN servicios s ON s.id_tipo_trabajo = t.id_tipo_trabajo ORDER BY t.id_tipo_trabajo, s.id_servicio');
        console.log(JSON.stringify(rows, null, 2));
        console.log('Migracion 24 aplicada. Copia previa en database/backups.');
    } finally { await connection.end(); }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
