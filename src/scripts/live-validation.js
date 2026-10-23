// Consultas con espera breve y descarte de respuestas de valores anteriores.
(function (root) {
    function crear({ inputs, message, read, check, duplicateMessage }) {
        let version = 0;
        let timer;
        function show(text, invalid = false) {
            message.textContent = text;
            inputs.forEach(input => {
                input.setCustomValidity(invalid ? text : '');
                input.setAttribute('aria-invalid', String(invalid));
            });
        }
        function reset() {
            version++;
            clearTimeout(timer);
            show('');
        }
        async function validate() {
            clearTimeout(timer);
            const current = ++version;
            const value = read();
            const snapshot = JSON.stringify(value);
            if (!value) { show(''); return false; }
            show('Verificando en la base de datos...');
            try {
                const result = await check(value);
                if (current !== version || snapshot !== JSON.stringify(read())) return false;
                show(result.duplicado ? duplicateMessage : 'Disponible.', result.duplicado);
                return !result.duplicado;
            } catch (error) {
                if (current !== version || snapshot !== JSON.stringify(read())) return false;
                show('No se pudo verificar. Revisa la conexion e intenta de nuevo.', true);
                return false;
            }
        }
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                reset();
                if (read()) {
                    show('Verificando en la base de datos...');
                    timer = setTimeout(validate, 350);
                }
            });
            input.addEventListener('blur', validate);
        });
        return { reset, validate };
    }
    if (typeof module === 'object' && module.exports) module.exports = { crear };
    else root.liveValidation = { crear };
})(typeof globalThis !== 'undefined' ? globalThis : this);
