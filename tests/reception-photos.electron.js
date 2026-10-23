// Verificacion con Electron real, sin ventanas visibles. No escribe en la base.
const {app, BrowserWindow, nativeImage} = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const QRCode = require('qrcode');
const root = path.join(__dirname, '..');
app.whenReady().then(async () => {
    const image = nativeImage.createFromBuffer(await QRCode.toBuffer('Foto de prueba', {width:100}));
    assert.equal(image.isEmpty(),false);
    assert(nativeImage.createFromBuffer(image.toJPEG(90)).getSize().width > 0);
    assert.equal(nativeImage.createFromBuffer(Buffer.from('falso')).isEmpty(),true);
    const win=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:false,preload:path.join(__dirname,'reception-photos.preload.js')}});
    win.webContents.on('console-message',(_event,level,message)=>{if(level>=2)console.error(message);});
    await win.loadFile(path.join(root,'src/views/recepcion.html'));
    // Esperar loadFile permite comprobar el marcado real; el script se inicializa con API simulada.
    await win.webContents.executeJavaScript(`
        (async()=>{
        document.getElementById('recepcionVehiculo').value='P-123ABC';
        document.getElementById('recepcionVehiculo').dispatchEvent(new Event('input'));
        document.getElementById('subirFotosRecepcion').click();
        })()
    `);
    await new Promise(resolve=>setTimeout(resolve,150));
    await win.webContents.executeJavaScript("document.getElementById('qrFotosRecepcion').click()");
    await new Promise(resolve=>setTimeout(resolve,150));
    const result=await win.webContents.executeJavaScript(`({
        previousSelector:!!document.getElementById('fotosRecepcionSeleccion'),
        photos:document.querySelectorAll('#galeriaFotosRecepcion figure').length,
        qr:document.getElementById('qrFotosDialog').open,
        qrWidth:document.getElementById('qrFotosImagen').naturalWidth,
        uploadEnabled:!document.getElementById('subirFotosRecepcion').disabled
    })`);
    assert.deepEqual(result,{previousSelector:false,photos:1,qr:true,qrWidth:280,uploadEnabled:true});
    await win.webContents.executeJavaScript(`document.getElementById('cerrarQrFotos').click()`);
    await new Promise(resolve=>setTimeout(resolve,50));
    assert.equal(await win.webContents.executeJavaScript('window.photoSmoke.revoked()'),true);
    console.log('Electron real: decodificacion, JPEG, galeria, QR y revocacion correctos.');
    win.destroy();app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
