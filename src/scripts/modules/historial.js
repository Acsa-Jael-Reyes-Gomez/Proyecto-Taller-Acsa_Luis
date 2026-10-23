const tablaHistorial = document.getElementById('historialTabla');
const resumenHistorial = document.getElementById('historialResumen');
let registrosHistorial = [], paginaHistorial = 0;
const normalizarHistorial = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function formatHistorialSearchInput(value, deleting = false) {
    let text = value.toUpperCase().replace(/^(\p{L})-(?=[\p{L}\s])/u, '$1');
    if (/^\p{L}$/u.test(text) && !deleting) return text + '-';
    return text.replace(/^(\p{L})-?(?=\d)/u, '$1-');
}
function filtrarHistorial(rows, busqueda, desde, hasta) {
    const consulta = normalizarHistorial(busqueda.trim().replace(/^(\p{L})-$/u, '$1'));
    const placa = consulta.replace(/[\s-]/g, '');
    return rows.filter(row =>
        ['Espera', 'Activa', 'Abierta', 'En proceso', 'Finalizada', 'Entregado'].includes(row.estado) &&
        (!desde || String(row.fecha).slice(0,10) >= desde) && (!hasta || String(row.fecha).slice(0,10) <= hasta) &&
        (normalizarHistorial(row.placa).replace(/[\s-]/g, '').includes(placa) ||
         [servicioSinEstado(row.servicios), row.mecanico].some(value => normalizarHistorial(value).includes(consulta))));
}
function servicioSinEstado(value) {
    return String(value ?? '').replace(/\s*\((?:realizado|pendiente|cancelado|en proceso|finalizado)\)/gi, '').trim();
}
function renderHistorial() {
    const rows = filtrarHistorial(registrosHistorial, ...['historialBuscar','historialDesde','historialHasta'].map(id => document.getElementById(id).value));
    const paginas = Math.max(1, Math.ceil(rows.length / 50)); paginaHistorial = Math.min(paginaHistorial, paginas - 1);
    tablaHistorial.replaceChildren(...rows.slice(paginaHistorial*50, (paginaHistorial+1)*50).map(row => {
        const tr = document.createElement('tr');
        for (const key of ['orden','fecha','placa','vehiculo','kilometraje','servicios','observaciones','mecanico']) { const td = document.createElement('td'); td.textContent = key === 'servicios' ? servicioSinEstado(row[key]) : row[key] ?? ''; tr.append(td); }
        const recepcion = document.createElement('td');
        if (row.id_recepcion) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'history-reception-button';
            button.textContent = 'Ver recepción'; button.dataset.receptionId = row.id_recepcion;
            recepcion.append(button);
        }
        tr.append(recepcion);
        return tr;
    }));
    resumenHistorial.textContent = rows.length ? `${rows.length} registros encontrados` : 'No hay registros con estos filtros.';
    document.getElementById('historialPagina').textContent = `${paginaHistorial + 1} / ${paginas}`;
    document.getElementById('historialAnterior').disabled = paginaHistorial === 0;
    document.getElementById('historialSiguiente').disabled = paginaHistorial >= paginas - 1;
}
tablaHistorial.addEventListener('click', async event => {
    const button = event.target.closest('.history-reception-button');
    if (!button || button.disabled) return;
    const id = Number(button.dataset.receptionId);
    try { await window.api.recepcion.abrirResumen(id); }
    catch (error) { await window.ui.alert(`No se pudo abrir la recepción: ${error.message}`); }
});
async function cargarHistorial() {
    const boton = document.getElementById('historialActualizar'); boton.disabled = true;
    resumenHistorial.textContent = 'Cargando historial...';
    try { registrosHistorial = await window.api.historial.list(); paginaHistorial = 0; renderHistorial(); }
    catch (error) { registrosHistorial = []; renderHistorial(); resumenHistorial.textContent = 'No se pudo cargar el historial.'; await window.ui.alert(error.message); }
    finally { boton.disabled = false; }
}
document.getElementById('historialBuscar').addEventListener('input', (event = {}) => {
    const input = document.getElementById('historialBuscar');
    if (!event.isComposing) {
        const before = input.value;
        const cursor = input.selectionStart ?? before.length;
        input.value = formatHistorialSearchInput(before, event.inputType?.startsWith('delete'));
        if (before !== input.value) {
            const position = Math.max(0, Math.min(input.value.length, cursor + input.value.length - before.length));
            input.setSelectionRange?.(position, position);
        }
    }
    paginaHistorial = 0; renderHistorial();
});
for (const id of ['historialDesde','historialHasta']) document.getElementById(id).addEventListener('input', () => { paginaHistorial = 0; renderHistorial(); });
document.getElementById('historialAnterior').addEventListener('click', () => { paginaHistorial--; renderHistorial(); });
document.getElementById('historialSiguiente').addEventListener('click', () => { paginaHistorial++; renderHistorial(); });
document.getElementById('historialActualizar').addEventListener('click', cargarHistorial);
cargarHistorial();
