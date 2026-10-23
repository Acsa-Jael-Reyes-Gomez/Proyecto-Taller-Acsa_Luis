(function (root) {
    const campos = {
        numero: 'No. orden', serie: 'Serie', fechaEntrada: 'Fecha entrada', horaEntrada: 'Hora entrada',
        periodoEntrada: 'Periodo entrada', fechaSalida: 'Fecha salida', horaSalida: 'Hora salida',
        periodoSalida: 'Periodo salida', placa: 'Placa', vehiculo: 'Vehiculo', piloto: 'Cliente',
        marca: 'Marca', tipoVehiculo: 'Tipo de vehiculo', proximoServicio: 'Proximo servicio',
        trabajos: 'Detalle de trabajo'
    };
    function validarOrden(value) {
        const orden = { ...value };
        if (orden.observaciones != null && typeof orden.observaciones !== 'string') throw new Error('Observaciones debe ser texto.');
        orden.observaciones = orden.observaciones?.trim() || 'ninguna observacion';
        for (const [key, label] of Object.entries(campos)) {
            if (['fechaSalida', 'horaSalida', 'periodoSalida'].includes(key) && !['Finalizada', 'Entregado'].includes(orden.estado) && !orden[key]) continue;
            if (typeof orden[key] !== 'string' || !orden[key].trim()) throw new Error(`Completa el campo ${label}.`);
            orden[key] = orden[key].trim();
        }
        for (const key of ['fechaEntrada', 'fechaSalida']) {
            if (key === 'fechaSalida' && !orden[key]) continue;
            const fecha = new Date(orden[key] + 'T00:00:00Z');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(orden[key]) || !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0,10) !== orden[key]) throw new Error(`Ingresa una ${campos[key]} valida.`);
        }
        for (const key of ['horaEntrada', 'horaSalida']) {
            if (key === 'horaSalida' && !orden[key]) continue;
            if (!/^(?:0?[1-9]|1[0-2]):[0-5]\d$/.test(orden[key])) throw new Error(`Ingresa una ${campos[key]} valida.`);
        }
        for (const key of ['periodoEntrada', 'periodoSalida']) {
            if (key === 'periodoSalida' && !orden[key]) continue;
            if (!['AM', 'PM'].includes(orden[key])) throw new Error(`Selecciona el ${campos[key]}.`);
        }
        for (const [key, label] of [['kilometraje', 'Kilometraje'], ['totalManoObra', 'Mano de obra total']]) {
            if (orden[key] == null || String(orden[key]).trim() === '' || !Number.isFinite(Number(orden[key])) || Number(orden[key]) < 0) throw new Error(`Completa correctamente el campo ${label}.`);
        }
        if (!Number.isInteger(Number(orden.idMecanico)) || Number(orden.idMecanico) <= 0) throw new Error('Selecciona el mecanico.');
        if (/^\d+(?:\.\d+)?$/.test(orden.proximoServicio) && Number(orden.proximoServicio) < Number(orden.kilometraje)) throw new Error(`El proximo kilometraje no puede ser menor al registrado (${orden.kilometraje} km).`);
        if (!['manoMecanico', 'manoElectronico', 'manoPintura', 'manoPinchazo'].some(key => orden[key] === true)) throw new Error('Selecciona el tipo de trabajo.');
        if (!Array.isArray(orden.servicios) || !orden.servicios.length || orden.servicios.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)) throw new Error('Selecciona el tipo de servicio.');
        return orden;
    }
    if (typeof module === 'object' && module.exports) module.exports = { validarOrden, campos };
    else root.ordenValidation = { validarOrden, campos };
})(typeof globalThis !== 'undefined' ? globalThis : this);
