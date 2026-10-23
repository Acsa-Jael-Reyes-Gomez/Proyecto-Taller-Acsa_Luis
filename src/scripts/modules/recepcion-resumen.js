const paramsResumen = new URLSearchParams(window.location.search);
const idResumen = Number(paramsResumen.get('id'));
const estadoResumen = document.getElementById('resumenEstado');
const datosResumen = document.getElementById('resumenDatos');
const fotosResumen = document.getElementById('resumenFotos');
const fotoDialog = document.getElementById('fotoDialog');

function campoResumen(label, value) {
    const wrapper = document.createElement('div'); wrapper.className = 'summary-item';
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = value == null || value === '' ? '—' : String(value);
    wrapper.append(term, description); return wrapper;
}

async function cargarResumen() {
    if (!Number.isInteger(idResumen) || idResumen <= 0) { estadoResumen.textContent = 'El identificador de recepción no es válido.'; return; }
    try {
        const recepcion = await window.api.recepcion.get(idResumen);
        document.getElementById('resumenTitulo').textContent = `Recepción #${recepcion.id_recepcion} · ${recepcion.placa}`;
        const campos = [
            ['Fecha de ingreso', recepcion.fecha_ingreso], ['Cliente', recepcion.cliente], ['Vehículo', recepcion.vehiculo],
            ['Placa', recepcion.placa], ['Kilometraje', `${recepcion.kilometraje} km`], ['Mecánico', recepcion.mecanico],
            ['Motivo', recepcion.motivo], ['Observaciones', recepcion.observaciones], ['Nivel de uso', recepcion.nivel_uso],
            ['Combustible', recepcion.combustible], ['Espejos', recepcion.espejos ? 'Sí' : 'No'],
            ['Batería', recepcion.bateria ? 'Sí' : 'No'], ['Documentos', recepcion.documentos ? 'Sí' : 'No']
        ];
        datosResumen.replaceChildren(...campos.map(([label, value]) => campoResumen(label, value)));
        const fotos = await window.api.recepcion.fotos.list(idResumen);
        if (!fotos.length) { fotosResumen.textContent = 'Esta recepción no tiene fotografías.'; }
        for (const foto of fotos) {
            const figure = document.createElement('figure');
            if (foto.miniatura) {
                const button = document.createElement('button'); button.type = 'button'; button.className = 'summary-photo';
                const image = document.createElement('img'); image.src = foto.miniatura; image.alt = foto.nombre || 'Foto de recepción';
                button.append(image);
                button.addEventListener('click', async () => {
                    try { document.getElementById('fotoGrande').src = await window.api.recepcion.fotos.view(idResumen, foto.id_foto); fotoDialog.showModal(); }
                    catch (error) { await window.ui.alert(`No se pudo abrir la fotografía: ${error.message}`); }
                });
                figure.append(button);
            }
            const caption = document.createElement('figcaption'); caption.textContent = foto.nombre || foto.error || 'Foto de recepción';
            figure.append(caption); fotosResumen.append(figure);
        }
        estadoResumen.textContent = `${fotos.length} fotografía(s) asociada(s) a esta recepción.`;
    } catch (error) { estadoResumen.textContent = 'No se pudo cargar el resumen de la recepción.'; await window.ui.alert(error.message); }
}

document.getElementById('cerrarFoto').addEventListener('click', () => fotoDialog.close());
fotoDialog.addEventListener('click', event => { if (event.target === fotoDialog) fotoDialog.close(); });
cargarResumen();
