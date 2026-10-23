const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crear } = require('../src/scripts/live-validation');
function setup(check) {
    const input = { value: '123', handlers: {}, setCustomValidity(value) { this.error = value; }, setAttribute() {}, addEventListener(name, fn) { this.handlers[name] = fn; } };
    const message = {};
    const validation = crear({ inputs: [input], message, read: () => input.value ? { value: input.value } : null, check, duplicateMessage: 'Duplicado' });
    return { input, message, validation };
}
test('Duplicado bloquea; corregirlo limpia el error; un fallo de consulta no indica disponible', async () => {
    const page = setup(async ({ value }) => { if (value === 'error') throw Error(); return { duplicado: value === '123' }; });
    assert.equal(await page.validation.validate(), false);
    assert.equal(page.input.error, 'Duplicado');
    page.input.value = '456';
    assert.equal(await page.validation.validate(), true);
    assert.equal(page.input.error, '');
    page.input.value = 'error';
    assert.equal(await page.validation.validate(), false);
    assert.match(page.message.textContent, /No se pudo verificar/);
    page.validation.reset();
    assert.equal(page.input.error, '');
});
test('Respuestas atrasadas y consultas de formularios cerrados no pisan el valor actual', async () => {
    const pending = [];
    const page = setup(() => new Promise(resolve => pending.push(resolve)));
    const first = page.validation.validate();
    page.input.value = '456';
    const second = page.validation.validate();
    pending[1]({ duplicado: false });
    assert.equal(await second, true);
    pending[0]({ duplicado: true });
    assert.equal(await first, false);
    assert.equal(page.input.error, '');
    const third = page.validation.validate();
    page.validation.reset();
    pending[2]({ duplicado: true });
    await third;
    assert.equal(page.message.textContent, '');
});
test('Escritura seguida consulta solo el ultimo valor', async () => {
    const calls = [];
    const page = setup(async value => { calls.push(value.value); return { duplicado: false }; });
    page.input.handlers.input();
    page.input.value = '456';
    page.input.handlers.input();
    await new Promise(resolve => setTimeout(resolve, 420));
    assert.deepEqual(calls, ['456']);
});
