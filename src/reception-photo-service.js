const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 20;
const TTL = 20 * 60 * 1000;

function supportedImage(buffer) {
    return (buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
        || (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
        || (buffer.length >= 12 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP');
}

function localAddresses() {
    return Object.values(os.networkInterfaces()).flat().filter(item => item && !item.internal && (item.family === 'IPv4' || item.family === 4)).map(item => item.address);
}
function createReceptionPhotoService({ database, directory, normalizeImage, previewImage = buffer => `data:image/jpeg;base64,${buffer.toString('base64')}`, addresses = localAddresses, now = Date.now }) {
    const sessions = new Map(), locks = new Map(), drafts = new Map();
    const keyOf = id => typeof id === 'string' && id.startsWith('d-') ? id : Number(id);
    function draft(id, owner) {
        const data = drafts.get(id);
        if (!data || (owner != null && data.owner !== owner)) throw new Error('El formulario de fotos ya no esta activo.');
        return data;
    }
    async function beginDraft(owner, userId, placa) {
        const id = `d-${crypto.randomUUID()}`;
        drafts.set(id, {owner,userId,placa:String(placa || ''),photos:[],nextPhotoId:1,frozen:false});
        return id;
    }
    async function discardDraft(id, owner) {
        const data = draft(id,owner); data.frozen = true;
        await locks.get(id)?.catch(() => {});
        revoke(owner,id); drafts.delete(id);
        for (const foto of data.photos) await fs.unlink(path.join(directory,foto.archivo)).catch(() => {});
    }
    async function removeDraftPhoto(id, owner, photoId) {
        const data = draft(id, owner);
        if (data.frozen) throw new Error('La recepcion ya se esta guardando.');
        const prior = locks.get(id) || Promise.resolve();
        const task = prior.catch(() => {}).then(async () => {
            const current = draft(id, owner);
            const index = current.photos.findIndex(photo => photo.id_foto === Number(photoId));
            if (index < 0) throw new Error('La foto no pertenece a este formulario.');
            await fs.unlink(path.join(directory, current.photos[index].archivo)).catch(error => { if (error.code !== 'ENOENT') throw error; });
            current.photos.splice(index, 1);
        });
        locks.set(id, task);
        try { await task; } finally { if (locks.get(id) === task) locks.delete(id); }
    }
    async function commitDraft(id, owner, create) {
        const data = draft(id,owner);
        if (data.frozen) throw new Error('La recepcion ya se esta guardando.');
        data.frozen = true;
        await locks.get(id)?.catch(() => {});
        try {
            const result = await create(await Promise.all(data.photos.map(async foto => ({archivo:foto.archivo,nombre:foto.nombre,origen:foto.origen,imagen:await readFile(foto)}))));
            revoke(owner,id); drafts.delete(id); return result;
        } catch (error) { data.frozen = false; throw error; }
    }
    let server, starting;
    async function save(id, buffer, nombre, origen, userId) {
        id = keyOf(id);
        if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_BYTES) throw new Error('Cada foto debe ocupar entre 1 byte y 10 MB.');
        if (!supportedImage(buffer)) throw new Error('Selecciona una foto JPG, PNG o WEBP.');
        const prior = locks.get(id) || Promise.resolve();
        const task = prior.catch(() => {}).then(async () => {
            const pending = drafts.has(id) ? draft(id) : null;
            if (typeof id === 'string' && !pending) throw new Error('El formulario ya no esta activo.');
            if (pending && (pending.frozen || pending.userId !== userId)) throw new Error('La recepcion se esta guardando o ya no esta activa.');
            if (!pending) await database.getRecepcion(id);
            if ((pending ? pending.photos : await database.listRecepcionFotos(id)).length >= MAX_PHOTOS) throw new Error('La recepcion ya tiene 20 fotos.');
            const image = await normalizeImage(buffer);
            if (!Buffer.isBuffer(image) || !image.length || image.length > MAX_BYTES) throw new Error('La imagen no es valida o supera 10 MB.');
            await fs.mkdir(directory, { recursive: true });
            const archivo = `${crypto.randomUUID()}.jpg`;
            const target = path.join(directory, archivo);
            await fs.writeFile(target, image, { flag: 'wx' });
            try {
                if (pending) {
                    const foto = {archivo,nombre:path.basename(String(nombre || 'Foto')).slice(0,255),origen,userId,id_foto:pending.nextPhotoId++};
                    pending.photos.push(foto); return {id:foto.id_foto};
                }
                return await database.addRecepcionFoto(Number(id), { archivo, imagen: image, nombre: path.basename(String(nombre || 'Foto')).replace(/[\x00-\x1f]/g, '').slice(0, 255), origen, userId });
            } catch (error) { await fs.unlink(target).catch(() => {}); throw error; }
        });
        locks.set(id, task);
        try { return await task; } finally { if (locks.get(id) === task) locks.delete(id); }
    }
    async function readFile(foto) {
        if (Buffer.isBuffer(foto.imagen) && foto.imagen.length) return foto.imagen;
        if (!/^[a-f0-9-]{36}\.jpg$/.test(foto.archivo)) throw new Error('Archivo de foto invalido.');
        return fs.readFile(path.join(directory, foto.archivo));
    }
    async function list(id) {
        id = keyOf(id);
        const rows = typeof id === 'string' ? draft(id).photos : await database.listRecepcionFotos(id);
        return Promise.all(rows.map(async foto => {
            const { imagen, ...metadata } = foto;
            try { return { ...metadata, miniatura: await previewImage(await readFile(foto)) }; }
            catch { return { ...metadata, miniatura: null, error: 'No se encontro la foto en esta computadora.' }; }
        }));
    }
    async function view(id, photoId) {
        id = keyOf(id);
        const rows = typeof id === 'string' ? draft(id).photos : await database.listRecepcionFotos(id);
        const foto = rows.find(row => row.id_foto === Number(photoId));
        if (!foto) throw new Error('La foto no pertenece a esta recepcion.');
        return `data:image/jpeg;base64,${(await readFile(foto)).toString('base64')}`;
    }
    function session(token) {
        const data = sessions.get(token);
        if (!data || data.expires <= now()) { sessions.delete(token); return null; }
        return data;
    }
    function respond(res, status, text, type = 'text/plain; charset=utf-8') {
        res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; frame-ancestors 'none'" });
        res.end(text);
    }
    async function handle(req, res) {
        try {
            const url = new URL(req.url, 'http://localhost');
            const match = /^\/r\/([a-f0-9]{64})(\/foto)?$/.exec(url.pathname);
            const data = match && session(match[1]);
            if (!data) return respond(res, 410, 'Este enlace no existe o ya vencio. Genera otro QR en Recepcion.');
            if (req.method === 'GET' && !match[2]) {
                const reception = typeof data.id === 'string' ? draft(data.id) : await database.getRecepcion(data.id);
                const template = await fs.readFile(path.join(__dirname, 'views/recepcion-fotos-movil.html'), 'utf8');
                const placa = String(reception.placa).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
                return respond(res, 200, template.replaceAll('{{PLACA}}', placa).replaceAll('{{ID}}', typeof data.id === 'string' ? 'actual (sin guardar)' : String(data.id)), 'text/html; charset=utf-8');
            }
            if (req.method !== 'POST' || !match[2]) return respond(res, 405, 'Metodo no permitido.');
            // La pagina del QR es el unico origen permitido para enviar fotos.
            if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return respond(res, 403, 'Origen no permitido.');
            if (Number(req.headers['content-length']) > MAX_BYTES) return respond(res, 413, 'La foto supera 10 MB.');
            const chunks = []; let size = 0;
            for await (const chunk of req) {
                size += chunk.length;
                if (size > MAX_BYTES) { respond(res, 413, 'La foto supera 10 MB.'); req.destroy(); return; }
                chunks.push(chunk);
            }
            if (!session(match[1])) return respond(res, 410, 'El QR vencio. Genera otro.');
            const result = await save(data.id, Buffer.concat(chunks), decodeURIComponent(req.headers['x-photo-name'] || 'Foto celular'), 'Celular', data.userId);
            respond(res, 201, JSON.stringify(result), 'application/json');
        } catch (error) { if (!res.headersSent) respond(res, 400, error.message || 'No se pudo guardar la foto.'); }
    }
    async function start() {
        if (server?.listening) return server.address().port;
        if (!starting) starting = new Promise((resolve, reject) => {
            server = http.createServer(handle);
            server.requestTimeout = 30000; server.headersTimeout = 15000;
            server.once('error', reject);
            server.listen(0, '0.0.0.0', () => { server.unref(); resolve(server.address().port); });
        }).finally(() => { starting = null; });
        return starting;
    }
    async function qr(id, userId, owner, address) {
        id = keyOf(id);
        const reception = typeof id === 'string' ? draft(id,owner) : await database.getRecepcion(id);
        const available = [...new Set(addresses())];
        if (!available.length) throw new Error('Conecta la computadora a la red Wi-Fi o Ethernet del taller.');
        if (address && !available.includes(address)) throw new Error('Selecciona una direccion de esta computadora.');
        const port = await start();
        for (const [key, data] of sessions) if (data.expires <= now() || (data.owner === owner && data.id === id)) sessions.delete(key);
        if (sessions.size >= 100) throw new Error('Hay demasiados enlaces activos. Cierra los anteriores.');
        const token = crypto.randomBytes(32).toString('hex');
        const expires = now() + TTL;
        const url = `http://${address || available[0]}:${port}/r/${token}`;
        sessions.set(token, { id, userId, owner, expires });
        return { url, imagen: await QRCode.toDataURL(url, { width: 280, margin: 4 }), expires, addresses: available, address: address || available[0], placa: reception.placa };
    }
    function revoke(owner, id) { for (const [key, data] of sessions) if (data.owner === owner && (id == null || data.id === keyOf(id))) sessions.delete(key); }
    async function discardOwner(owner) { for(const [id,data] of drafts) if(data.owner===owner) await discardDraft(id,owner); }
    async function close() { sessions.clear(); for(const [id,data] of drafts) await discardDraft(id,data.owner); if (server?.listening) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); } }
    return { save, list, view, removeDraftPhoto, qr, revoke, close, directory, beginDraft, discardDraft, commitDraft, authorizeDraft:draft, discardOwner };
}
module.exports = { createReceptionPhotoService, MAX_BYTES, MAX_PHOTOS };
