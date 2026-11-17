(() => {
    const field = id => document.getElementById(id);
    const form = field('formRecepcion');
    const save = field('guardarRecepcion');
    const message = field('recepcionMensaje');
    const generate = field('generarRecepcion');
    const documentDialog = field('documentoRecepcion');
    let savedId = null;
    generate.disabled = true;
    let vehicles = [], saving = false;
    const draftKey = 'recepcionNuevoCliente';
    const draftFields = ['recepcionVehiculo', 'recepcionCliente', 'recepcionKm', 'recepcionUso', 'recepcionMecanico', 'recepcionMotivo', 'recepcionObservaciones'];
    const draftChecks = ['recepcionEspejos', 'recepcionBateria', 'recepcionDocumentos'];
    field('nuevoClienteRecepcion').addEventListener('click', () => {
        if (saving) return;
        try {
            const token = crypto.randomUUID();
            const draft = { token, values: {}, checks: {}, fuel: form.querySelector('input[name="combustible"]:checked')?.value || '', savedId };
            draft.photoDraft=window.recepcionFotos?.estado();
            for (const id of draftFields) draft.values[id] = field(id).value;
            for (const id of draftChecks) draft.checks[id] = field(id).checked;
            sessionStorage.setItem(draftKey, JSON.stringify(draft));
            window.location.href = `pilotos.html?nuevo=1&origen=recepcion&retorno=${encodeURIComponent(token)}`;
        } catch (error) { message.textContent = `No se pudo abrir el registro de cliente: ${error.message}`; }
    });
    function restoreDraft() {
        const params = new URLSearchParams(window.location.search);
        if (!params.get('retorno')) return;
        try {
            const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
            if (!draft || draft.token !== params.get('retorno')) return;
            field('recepcionVehiculo').value = draft.values.recepcionVehiculo || '';
            updateVehicle();
            for (const id of draftFields) field(id).value = draft.values[id] ?? '';
            const placaNueva = params.get('placa');
            if (placaNueva) field('recepcionVehiculo').value = placaNueva;
            updateVehicle();
            for (const id of draftChecks) field(id).checked = Boolean(draft.checks[id]);
            for (const radio of form.querySelectorAll('input[name="combustible"]')) radio.checked = radio.value === draft.fuel;
            const clientId = params.get('cliente');
            if (clientId) field('recepcionCliente').value = clientId;
            savedId = draft.savedId || null; generate.disabled = !savedId;
            window.recepcionFotos?.restaurar(draft.photoDraft);
            sessionStorage.removeItem(draftKey);
            window.history.replaceState(null, '', 'recepcion.html');
            if (clientId) message.textContent = 'Cliente registrado y seleccionado. Continua con la recepcion.';
        } catch (error) { message.textContent = `No se pudieron recuperar los datos de recepcion: ${error.message}`; }
    }

    function option(value, label) {
        const node = document.createElement('option');
        node.value = value; node.textContent = label;
        return node;
    }
    function updateVehicle() {
        const vehicle = selectedVehicle();
        validatePlate();
        field('recepcionCliente').value = vehicle?.idCliente || '';
        field('recepcionMarca').value = vehicle?.marca || '';
        field('recepcionModelo').value = vehicle?.modelo || '';
        field('recepcionKm').value = vehicle?.kilometraje ?? '';
        field('recepcionKm').min = vehicle?.kilometraje || 0;
        validarKilometrajeRecepcion();
        field('recepcionUso').value = vehicle?.nivelUso || 'Normal';
    }
    function selectedVehicle() {
        const plate = field('recepcionVehiculo').value.toUpperCase().replace(/[\s-]/g, '');
        return vehicles.find(v => !v.kilometrajeBloqueado && v.placa.toUpperCase().replace(/[\s-]/g, '') === plate);
    }
    function validarKilometrajeRecepcion() {
        const input = field('recepcionKm');
        const registrado = selectedVehicle()?.kilometraje;
        const alerta = input.value !== '' && registrado != null && Number(input.value) < Number(registrado)
            ? `El kilometraje no puede ser menor al ya registrado (${registrado} km).` : '';
        input.setCustomValidity(alerta);
        field('recepcionKmValidacion').textContent = alerta;
    }
    field('recepcionKm').addEventListener('input', validarKilometrajeRecepcion);
    function validatePlate() {
        field('recepcionVehiculo').setCustomValidity(field('recepcionVehiculo').value && !selectedVehicle() ? 'Selecciona una placa registrada sin ordenes en Espera, Activa, En proceso o Finalizada.' : '');
    }
    async function load() {
        save.disabled = true;
        try {
            const [v, m, clients] = await Promise.all([window.api.vehiculos.list(), window.api.mecanicos.list(), window.api.pilotos.list()]);
            const selected = field('recepcionVehiculo').value;
            const selectedMechanic = field('recepcionMecanico').value;
            const selectedClient = field('recepcionCliente').value;
            vehicles = v;
            field('placasRecepcion').replaceChildren(...v.filter(item => !item.kilometrajeBloqueado).map(item => option(item.placa, item.placa)));
            field('recepcionVehiculo').value = selected;
            field('recepcionMecanico').replaceChildren(option('', 'Sin asignar todavia'), ...m.map(item => option(item.id_mecanico, item.nombre)));
            field('recepcionMecanico').value = selectedMechanic;
            field('recepcionCliente').replaceChildren(option('', 'Selecciona un cliente registrado'), ...clients.map(item => option(item.id, item.nombre)));
            field('recepcionCliente').value = selectedClient;
            save.disabled = saving;
            return true;
        } catch (error) {
            message.textContent = `No se pudo cargar Recepcion: ${error.message}`;
            return false;
        }
    }
    field('recepcionVehiculo').addEventListener('change', updateVehicle);
    field('cambiarPlacaRecepcion').addEventListener('click', () => {
        if (saving) return;
        const input = field('recepcionVehiculo');
        input.value = ''; updateVehicle(); input.focus();
        try { input.showPicker?.(); } catch { /* La placa tambien se puede escribir. */ }
    });
    field('recepcionVehiculo').addEventListener('input', () => {
        field('recepcionVehiculo').value = field('recepcionVehiculo').value.toUpperCase();
        updateVehicle();
    });
    async function generateDocument(id) {
        generate.disabled = true;
        try {
            const reception = await window.api.recepcion.get(id);
            field('fichaRecepcion').replaceChildren(window.recepcionDocumento.crearDocumento(document, reception));
            if (!documentDialog.open) documentDialog.showModal();
        } catch (error) { message.textContent = `No se pudo generar el documento: ${error.message}`; }
        finally { generate.disabled = !savedId; field('abrirBoletaRecepcion').disabled = !field('boletaRecepcionSeleccion').value; }
    }
    async function loadBoletas(selected = '') {
        const select = field('boletaRecepcionSeleccion');
        field('abrirBoletaRecepcion').disabled = true;
        try {
            const rows = await window.api.recepcion.list();
            select.replaceChildren(option('', 'Selecciona una recepcion guardada'), ...rows.map(row => option(row.id_recepcion, `#${row.id_recepcion} - ${row.placa} - ${row.cliente || ''} - ${row.fecha_ingreso}`)));
            select.value = String(selected || '');
            field('mensajeBoletasRecepcion').textContent = rows.length ? '' : 'Todavia no hay recepciones guardadas.';
        } catch (error) { field('mensajeBoletasRecepcion').textContent = `No se pudieron cargar las boletas: ${error.message}`; }
        finally { field('abrirBoletaRecepcion').disabled = !select.value; }
    }
    field('boletaRecepcionSeleccion').addEventListener('change', () => { field('abrirBoletaRecepcion').disabled = !field('boletaRecepcionSeleccion').value; });
    field('abrirBoletaRecepcion').addEventListener('click', () => {
        const selected = field('boletaRecepcionSeleccion').value;
        if (selected) { field('abrirBoletaRecepcion').disabled = true; generateDocument(Number(selected)); }
    });
    generate.addEventListener('click', () => { if (savedId) generateDocument(savedId); });
    field('imprimirRecepcion').addEventListener('click', () => window.print());
    field('cerrarDocumentoRecepcion').addEventListener('click', () => documentDialog.close());
    form.addEventListener('reset', () => { savedId = null; generate.disabled = true; setTimeout(updateVehicle, 0); });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        validatePlate();
        validarKilometrajeRecepcion();
        if (saving || !form.reportValidity()) return;
        saving = true; save.disabled = true; message.textContent = '';
        const fuel = form.querySelector('input[name="combustible"]:checked');
        let registered = false;
        try {
            const photoDraft = await window.recepcionFotos?.prepararGuardado();
            const result = await window.api.recepcion.create({
                photoDraft, placaFotos: field('recepcionVehiculo').value,
                idVehiculo: selectedVehicle()?.id, idCliente: field('recepcionCliente').value, idMecanico: field('recepcionMecanico').value,
                kilometraje: field('recepcionKm').value, nivelUso: field('recepcionUso').value,
                combustible: fuel?.value, motivo: field('recepcionMotivo').value,
                observaciones: field('recepcionObservaciones').value,
                espejos: field('recepcionEspejos').checked, bateria: field('recepcionBateria').checked, documentos: field('recepcionDocumentos').checked
            });
            registered = true; form.reset(); updateVehicle();
            savedId = result.id; generate.disabled = false;
            loadBoletas(result.id);
            window.recepcionFotos?.guardada();
            window.recepcionNotificaciones?.actualizar();
            saving = false;
            if (await load()) message.textContent = `Recepcion #${result.id} registrada. Orden ${result.numeroOrden || ''} creada en Espera. El vehiculo esta en taller.`;
            else message.textContent = `Recepcion #${result.id} registrada. No se pudieron actualizar los datos del formulario; vuelve a abrir el modulo.`;
        } catch (error) { message.textContent = `No se pudo registrar el ingreso: ${error.message}`; }
        finally { saving = false; window.recepcionFotos?.terminarGuardado(); if (!registered) save.disabled = false; }
    });
    loadBoletas();
    load().then(loaded => { if (loaded) restoreDraft(); });
})();
