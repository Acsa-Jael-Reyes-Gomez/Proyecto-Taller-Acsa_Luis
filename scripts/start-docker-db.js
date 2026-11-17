// Usa exactamente las mismas credenciales que Docker Compose, sin cambiar db-config.js.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) throw new Error('Copia .env.example a .env y configura las claves antes de iniciar.');
const config = require('node:util').parseEnv(fs.readFileSync(envPath, 'utf8'));
for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'DB_PASSWORD']) {
    if (!config[key]) throw new Error(`Falta ${key} en .env`);
}
const child = spawn(require('electron'), ['.'], {
    cwd: path.join(__dirname, '..'), stdio: 'inherit', env: { ...process.env, ...config }
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
