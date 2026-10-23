const { test } = require('node:test');
const assert = require('node:assert/strict');
const { repararTexto } = require('../src/text-encoding');

test('Recupera tildes con una o varias capas de codificacion incorrecta', () => {
    assert.equal(repararTexto('revisiÃ³n general de sistema elÃ©ctrico'), 'revisión general de sistema eléctrico');
    assert.equal(repararTexto('revisiÃƒÂƒÃ‚Â³n'), 'revisión');
    assert.equal(repararTexto('JosÃ© MuÃ±oz'), 'José Muñoz');
});

test('Conserva caracteres validos y no inventa texto que no se puede recuperar', () => {
    for (const value of ['Revisión, lubricación, niño, pingüino', 'A & B <pieza> "especial"', '日本語 🔧', 'Ã', 'daño �', null]) {
        assert.equal(repararTexto(value), value);
    }
});
