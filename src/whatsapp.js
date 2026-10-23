function construirEnlaceWhatsApp(telefono, mensaje) {
    const raw = String(telefono || '').trim();
    if (!/^[+\d\s().-]+$/.test(raw)) throw new Error('El cliente necesita un telefono valido para WhatsApp.');
    let number = raw.replace(/\D/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.length === 8 && !raw.startsWith('+') && !raw.startsWith('00')) number = '502' + number;
    if (!/^[1-9]\d{8,14}$/.test(number)) throw new Error('Revisa el telefono del cliente y su codigo de pais.');
    if (typeof mensaje !== 'string' || !mensaje.trim() || mensaje.length > 4000) throw new Error('Mensaje de WhatsApp invalido.');
    return `https://wa.me/${number}?text=${encodeURIComponent(mensaje)}`;
}
module.exports = { construirEnlaceWhatsApp };
