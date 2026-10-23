// Recupera secuencias UTF-8 interpretadas como Windows-1252, sin quitar tildes.
const windows1252 = new TextDecoder('windows-1252');
const utf8 = new TextDecoder('utf-8', { fatal: true });
const bytesPorCaracter = new Map();
for (let byte = 0; byte < 256; byte++) {
    bytesPorCaracter.set(windows1252.decode(Uint8Array.of(byte)), byte);
    // Algunas capas antiguas usaron ISO-8859-1 y conservaron controles C1.
    bytesPorCaracter.set(String.fromCharCode(byte), byte);
}

function repararTexto(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/[^\x00-\x7f]+/gu, fragmento => {
        let actual = fragmento;
        for (let intento = 0; intento < 8 && /[\u00c2\u00c3\u00e2\u00f0]/u.test(actual); intento++) {
            const caracteres = Array.from(actual);
            if (caracteres.some(char => !bytesPorCaracter.has(char))) break;
            try {
                const nuevo = utf8.decode(Uint8Array.from(caracteres, char => bytesPorCaracter.get(char)));
                if (nuevo === actual || nuevo.includes('\ufffd')) break;
                actual = nuevo;
            } catch { break; }
        }
        return actual;
    });
}

module.exports = { repararTexto };
