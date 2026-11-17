const idResumen = Number(new URLSearchParams(window.location.search).get('id'));
const estadoResumen = document.getElementById('resumenEstado');
const datosResumen = document.getElementById('resumenDatos');
const fotosResumen = document.getElementById('resumenFotos');
const fotoDialog = document.getElementById('fotoDialog');
window.api.auth.onLoggedOut(() => window.location.replace('login.html'));

function campoResumen(label, value) {
    const wrapper = document.createElement('div'); wrapper.className = 'summary-field';
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = value == null || value === '' ? '—' : String(value);
    wrapper.append(term, description); return wrapper;
}

async function girarFotoCelularAntigua(src) {
    const image = new Image(); image.src = src; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalHeight; canvas.height = image.naturalWidth;
    const context = canvas.getContext('2d'); context.translate(canvas.width, 0); context.rotate(Math.PI / 2); context.drawImage(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
}
function fotoCelularSinOrientacion(foto) { return foto.origen === 'Celular' && /^\d{10,}.*\.(?:jpg|jpeg)$/i.test(foto.nombre || ''); }

function indicadorResumen(value, fallback = 'Sin asignar') {
    const item = document.createElement('span'); item.className = 'summary-metric'; item.textContent = value || fallback; return item;
}

function notaResumen(title, text) {
    const block = document.createElement('article'); block.className = 'summary-note';
    const heading = document.createElement('h3'); heading.textContent = title;
    const content = document.createElement('p'); content.textContent = text || 'Sin información registrada.';
    block.append(heading, content); return block;
}

function verificacionResumen(label, checked) {
    const item = document.createElement('span'); item.className = `summary-check${checked ? '' : ' is-no'}`;
    item.textContent = `${label}: ${checked ? 'Sí' : 'No'}`; return item;
}

async function cargarResumen() {
    if (!Number.isInteger(idResumen) || idResumen <= 0) { estadoResumen.textContent = 'El identificador de recepción no es válido.'; return; }
    try {
        const recepcion = await window.api.recepcion.get(idResumen);
        document.getElementById('resumenEncabezado').hidden = false;
        document.getElementById('resumenNumero').textContent = `Recepción #${recepcion.id_recepcion}`;
        document.getElementById('resumenPlaca').textContent = recepcion.placa || 'Vehículo sin placa';
        document.getElementById('resumenVehiculo').textContent = `${recepcion.vehiculo || 'Vehículo'} · ${recepcion.cliente || 'Cliente sin nombre'}`;
        document.title = `Recepción ${recepcion.placa || idResumen} | Taller`;
        document.getElementById('resumenIndicadores').replaceChildren(
            indicadorResumen(`Ingreso: ${recepcion.fecha_ingreso || 'Sin fecha'}`),
            indicadorResumen(`Kilometraje: ${recepcion.kilometraje ?? '—'} km`),
            indicadorResumen(`Mecánico: ${recepcion.mecanico || 'Sin asignar'}`)
        );
        const campos = [
            ['Cliente', recepcion.cliente], ['Vehículo', recepcion.vehiculo], ['Placa', recepcion.placa],
            ['Fecha y hora de ingreso', recepcion.fecha_ingreso], ['Kilometraje registrado', `${recepcion.kilometraje ?? '—'} km`],
            ['Mecánico asignado', recepcion.mecanico], ['Nivel de uso', recepcion.nivel_uso], ['Nivel de combustible', recepcion.combustible]
        ];
        datosResumen.replaceChildren(...campos.map(([label, value]) => campoResumen(label, value)));
        document.getElementById('resumenNotas').replaceChildren(
            notaResumen('Motivo de ingreso', recepcion.motivo),
            notaResumen('Observaciones', recepcion.observaciones)
        );
        document.getElementById('resumenEstadoVehiculo').replaceChildren(
            verificacionResumen('Espejos', Number(recepcion.espejos) === 1),
            verificacionResumen('Batería', Number(recepcion.bateria) === 1),
            verificacionResumen('Documentos', Number(recepcion.documentos) === 1)
        );
        const fotos = await window.api.recepcion.fotos.list(idResumen);
        if (!fotos.length) { const empty = document.createElement('p'); empty.className = 'summary-empty'; empty.textContent = 'No se guardaron fotografías con esta recepción.'; fotosResumen.append(empty); }
        for (const [index, foto] of fotos.entries()) {
            const nombreVisible = `Foto ${index + 1}`;
            const figure = document.createElement('figure'); figure.className = 'summary-photo';
            if (foto.miniatura) {
                const image = document.createElement('img'); image.src = foto.miniatura; image.alt = foto.nombre || 'Foto del vehículo'; image.loading = 'lazy';
                if (fotoCelularSinOrientacion(foto)) image.src = await girarFotoCelularAntigua(foto.miniatura);
                figure.append(image);
                if (fotoCelularSinOrientacion(foto)) figure.addEventListener('click', async event => {
                    event.stopImmediatePropagation();
                    try {
                        const original = await window.api.recepcion.fotos.view(idResumen, foto.id_foto);
                        document.getElementById('fotoGrande').src = await girarFotoCelularAntigua(original);
                        fotoDialog.showModal();
                    } catch (error) { await window.ui.alert(`No se pudo abrir la fotografía: ${error.message}`); }
                }, true);
                figure.addEventListener('click', async () => {
                    try { document.getElementById('fotoGrande').src = await window.api.recepcion.fotos.view(idResumen, foto.id_foto); fotoDialog.showModal(); }
                    catch (error) { await window.ui.alert(`No se pudo abrir la fotografía: ${error.message}`); }
                });
            }
            const caption = document.createElement('figcaption'); caption.textContent = foto.error ? `${nombreVisible} · ${foto.error}` : nombreVisible; figure.append(caption);
            fotosResumen.append(figure);
        }
        estadoResumen.textContent = '';
    } catch (error) {
        estadoResumen.textContent = 'No se pudo cargar el resumen completo de esta recepción.';
        await window.ui.alert(error.message);
    }
}

document.getElementById('cerrarFoto').addEventListener('click', () => fotoDialog.close());
fotoDialog.addEventListener('click', event => { if (event.target === fotoDialog) fotoDialog.close(); });
cargarResumen();
