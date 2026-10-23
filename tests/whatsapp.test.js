const { test } = require('node:test');
const assert = require('node:assert/strict');
const { construirEnlaceWhatsApp } = require('../src/whatsapp');
test('WhatsApp usa codigo 502 para telefono local y codifica el mensaje', () => {
    const url=new URL(construirEnlaceWhatsApp('5555-1234','Hola Ana & Luis, placa P-1'));
    assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/50255551234');
    assert.equal(url.searchParams.get('text'),'Hola Ana & Luis, placa P-1');
    assert.equal(new URL(construirEnlaceWhatsApp('+502 5555 1234','Hola')).pathname,'/50255551234');
});
test('WhatsApp rechaza telefonos inexistentes e inyecciones de enlaces', () => {
    for(const phone of ['', '123', 'https://example.com', '55551234?text=otro']) assert.throws(()=>construirEnlaceWhatsApp(phone,'Hola'));
});
