// API de prueba. Ninguna llamada alcanza la base de datos ni archivos del usuario.
const {contextBridge}=require('electron');
const QRCode=require('qrcode');
sessionStorage.setItem('currentUser',JSON.stringify({id:1,usuario:'prueba'}));
const image=QRCode.toDataURL('Foto de prueba',{width:100});
let revoked=false;
contextBridge.exposeInMainWorld('photoSmoke',{revoked:()=>revoked});
contextBridge.exposeInMainWorld('api',{
    vehiculos:{list:async()=>[]},mecanicos:{list:async()=>[]},pilotos:{list:async()=>[]},ordenes:{list:async()=>[]},dashboard:{get:async()=>({servicios:[]})},
    recepcion:{list:async()=>[{id_recepcion:7,placa:'P-123ABC',fecha_ingreso:'2026-10-04 10:00:00'}],fotos:{
        begin:async()=> 'd-prueba',discard:async()=>{},
        list:async()=>[{id_foto:1,nombre:'frente.jpg',origen:'Celular',miniatura:await image}],
        view:async()=>image,upload:async()=>({guardadas:1,errores:[]}),
        qr:async()=>({imagen:await QRCode.toDataURL('http://192.168.1.20:12345/r/test',{width:280}),url:'http://192.168.1.20:12345/r/test',expires:Date.now()+1200000,addresses:['192.168.1.20'],address:'192.168.1.20',placa:'P-123ABC'}),
        revoke:async()=>{revoked=true;}
    }}
});
