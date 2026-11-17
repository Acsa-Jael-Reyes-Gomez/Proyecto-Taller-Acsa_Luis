// Crea una cuenta de demostracion en la base Docker; nunca usa db-config.js.
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
async function main() {
    const env = require('node:util').parseEnv(fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8'));
    for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'ADMIN_USER', 'ADMIN_PASSWORD']) {
        if (!env[key]) throw new Error(`Falta ${key} en .env`);
    }
    if (env.DB_NAME !== 'taller_ttc') throw new Error('Compose utiliza la base taller_ttc.');
    const c = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME });
    try {
        const [existing] = await c.execute('SELECT id_usuario FROM usuarios WHERE usuario = ?', [env.ADMIN_USER]);
        if (existing.length) throw new Error('El usuario ya existe; no se modifico su clave ni su rol.');
        await c.execute("INSERT INTO usuarios (usuario, password_hash, nombre, apellido, rol, estado, fecha_creacion, fecha_actualizacion) VALUES (?, ?, 'Administrador', 'Demo', 'Administrador', 'Activo', NOW(), NOW())", [env.ADMIN_USER, env.ADMIN_PASSWORD]);
        console.log('Administrador de demostracion creado. Usa ADMIN_USER y ADMIN_PASSWORD de .env para ingresar.');
    } finally { await c.end(); }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
