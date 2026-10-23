const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createReceptionPhotoService, MAX_BYTES } = require('../src/reception-photo-service');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6DmsAAAAASUVORK5CYII=', 'base64');
async function setup(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taller-fotos-'));
    const rows = []; let time = 1000000, fail = false;
    const database = {
        getRecepcion: async id => { if (![1,2].includes(id)) throw Error('La recepcion no existe.'); return {id_recepcion:id, placa:'P-123ABC'}; },
        listRecepcionFotos: async id => rows.filter(row => row.id_recepcion === id),
        addRecepcionFoto: async (id, foto) => { if (fail) throw Error('Error DB'); rows.push({...foto, id_recepcion:id, id_foto:rows.length+1}); return {id:rows.length}; }
    };
    const service = createReceptionPhotoService({ database, directory, normalizeImage: async () => Buffer.from([255,216,255,217]), addresses: () => ['127.0.0.1'], now: () => time });
    t.after(async () => { await service.close(); await fs.rm(directory, {recursive:true,force:true}); });
    return {service, rows, directory, expire:()=>{time+=21*60000;}, fail:()=>{fail=true;}};
}
test('Fotos se vinculan a su recepcion, se consultan y no dejan archivos si falla DB', async t => {
    const {service,rows,directory,fail} = await setup(t);
    await service.save(1,png,'../vehiculo.png','Computadora',3);
    assert.equal(rows[0].nombre,'vehiculo.png');
    assert.equal(rows[0].userId,3);
    assert(Buffer.isBuffer(rows[0].imagen));
    await fs.unlink(path.join(directory, rows[0].archivo));
    assert.match(await service.view(1,1), /^data:image\/jpeg;base64,/);
    assert.equal((await service.list(1))[0].imagen, undefined);
    assert.equal((await service.list(1)).length,1);
    assert.equal((await service.list(2)).length,0);
    assert.match(await service.view(1,1),/^data:image\/jpeg;base64,/);
    await assert.rejects(service.view(2,1),/no pertenece/);
    await assert.rejects(service.save(99,png,'foto.png','Celular',3),/no existe/);
    fail(); await assert.rejects(service.save(1,png,'foto.png','Celular',3),/Error DB/);
    assert.equal((await fs.readdir(directory)).length,0);
});
test('Limites y archivos falsos se rechazan y cargas simultaneas respetan el maximo', async t => {
    const {service,rows} = await setup(t);
    await assert.rejects(service.save(1,Buffer.from('<html>falso</html>'),'foto.jpg','Celular',3),/JPG/);
    await assert.rejects(service.save(1,Buffer.alloc(MAX_BYTES+1),'foto.png','Celular',3),/10 MB/);
    for(let i=0;i<19;i++) await service.save(1,png,'foto.png','Celular',3);
    const result=await Promise.allSettled([service.save(1,png,'a.png','Celular',3),service.save(1,png,'b.png','Celular',3)]);
    assert.equal(result.filter(value=>value.status==='fulfilled').length,1);
    assert.equal(rows.length,20);
});
test('QR real permite carga HTTP solo en su recepcion; renovar, revocar y vencer invalidan el enlace', async t => {
    const {service,rows,expire} = await setup(t);
    const qr=await service.qr(1,3,5);
    assert.match(qr.imagen,/^data:image\/png;base64,/);
    const page=await fetch(qr.url); assert.equal(page.status,200); const html=await page.text();
    assert(html.includes('P-123ABC')); assert(html.includes('capture="environment"'));
    assert.equal((await fetch(qr.url+'/foto',{method:'POST',headers:{Origin:'http://otro-host'},body:png})).status,403);
    const response=await fetch(qr.url+'/foto',{method:'POST',headers:{'X-Photo-Name':encodeURIComponent('Estado frontal.png')},body:png});
    assert.equal(response.status,201); assert.equal(rows[0].id_recepcion,1); assert.equal(rows[0].origen,'Celular');
    const renewed=await service.qr(1,3,5);
    assert.equal((await fetch(qr.url)).status,410);
    service.revoke(5,1); assert.equal((await fetch(renewed.url)).status,410);
    const expired=await service.qr(1,3,5); expire(); assert.equal((await fetch(expired.url)).status,410);
    await assert.rejects(service.qr(1,3,5,'8.8.8.8'),/direccion/);
});

test('IPC de fotos exige una sesion antes de listar, subir, abrir o generar QR', () => {
    const vm = require('node:vm'), handlers = new Map();
    const electron = {app:{whenReady:()=>({then(){}}),on(){}},ipcMain:{handle:(name,fn)=>handlers.set(name,fn)}};
    const ctx = vm.createContext({require:name=>name==='electron'?electron:name==='path'?path:name.endsWith('orden-validation')?require('../src/scripts/orden-validation'):{}});
    vm.runInContext(require('node:fs').readFileSync('main.js','utf8'),ctx);
    vm.runInContext('registerDatabaseHandlers()',ctx);
    for(const name of ['list','view','qr','revoke']) assert.throws(()=>handlers.get('recepcion:fotos:'+name)({sender:{}},1,1),/Inicia sesion/);
    return assert.rejects(handlers.get('recepcion:fotos:upload')({sender:{}},1),/Inicia sesion/);
});

test('Fotos del formulario actual no se asocian a una recepcion anterior y sobreviven a un fallo de guardado', async t => {
    const {service,rows}=await setup(t);
    const id=await service.beginDraft(5,3,'P-123ABC');
    await service.save(id,png,'ingreso.png','Computadora',3);
    assert.equal(rows.length,0);
    assert.equal((await service.list(id)).length,1);
    assert.throws(()=>service.authorizeDraft(id,9),/no esta activo/);
    const qr=await service.qr(id,3,5);
    assert.equal((await fetch(qr.url+'/foto',{method:'POST',body:png})).status,201);
    await assert.rejects(service.commitDraft(id,5,async()=>{throw Error('Fallo al guardar');}),/Fallo al guardar/);
    assert.equal((await service.list(id)).length,2);
    let attached;
    const result=await service.commitDraft(id,5,async photos=>{attached=photos;return {id:99};});
    assert.equal(result.id,99);assert.equal(attached.length,2);assert(attached.every(photo => Buffer.isBuffer(photo.imagen)));
    assert.equal(rows.length,0);
    assert.equal((await fetch(qr.url)).status,410);
    await assert.rejects(service.list(id),/no esta activo/);
});

test('Limpiar el formulario descarta sus fotos temporales y revoca el QR', async t=>{
    const {service,directory}=await setup(t);
    const id=await service.beginDraft(5,3,'P-123ABC');
    await service.save(id,png,'ingreso.png','Computadora',3);
    const qr=await service.qr(id,3,5);
    await service.discardDraft(id,5);
    assert.equal((await fs.readdir(directory)).length,0);
    assert.equal((await fetch(qr.url)).status,410);
});


test('Quitar una foto permite reemplazarla sin reutilizar IDs y guardar solo las seleccionadas', async t => {
    const {service,directory}=await setup(t);
    const id=await service.beginDraft(5,3,'P-123ABC');
    await service.save(id,png,'primera.png','Computadora',3);
    await service.save(id,png,'segunda.png','Celular',3);
    await assert.rejects(service.removeDraftPhoto(id,9,1),/no esta activo/);
    await service.removeDraftPhoto(id,5,1);
    assert.equal((await fs.readdir(directory)).length,1);
    await service.save(id,png,'reemplazo.png','Computadora',3);
    const photos=await service.list(id);
    assert.deepEqual(photos.map(photo=>photo.id_foto),[2,3]);
    await assert.rejects(service.removeDraftPhoto(id,5,1),/no pertenece/);
    await service.commitDraft(id,5,async attached=>{
        assert.deepEqual(attached.map(photo=>photo.nombre),['segunda.png','reemplazo.png']);
        return {id:8};
    });
});
