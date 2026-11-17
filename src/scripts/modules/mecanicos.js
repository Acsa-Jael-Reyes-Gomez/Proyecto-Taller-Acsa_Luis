let mecanicos = [], mecanicoId = null, modoMecanico = 'nuevo', guardandoMecanico = false;
let focoMecanico;
let ordenesMecanicos = [];
let periodoGraficaActual = '';
const coloresGraficasMecanicos = [
 '#ef4444','#facc15','#3b82f6','#f97316','#22c55e','#8b5cf6',
 '#ec4899','#06b6d4','#84cc16','#6366f1','#14b8a6','#f472b6',
 '#0ea5e9','#a3e635','#d946ef','#fb7185','#2dd4bf','#818cf8'
];
const camposMecanico = ['nombre','edad','dpi','correo','direccion','fecha_contratacion'];
const nodoMecanico = id => document.getElementById(id);
const normalizarMecanico = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const validacionMecanicoDpi = window.liveValidation.crear({
 inputs: [nodoMecanico('mecanico_dpi')], message: nodoMecanico('mecanicoDpiValidacion'),
 read: () => nodoMecanico('mecanico_dpi').value.trim() ? { dpi: nodoMecanico('mecanico_dpi').value.trim(), id: mecanicoId } : null,
 check: ({dpi,id}) => window.api.mecanicos.checkDpi(dpi,id), duplicateMessage: 'Ya existe un mecanico con ese DPI.'
});
function abrirMecanico(mecanico = null, modo = 'nuevo', foco = nodoMecanico('mecanicoNuevo')) {
 validacionMecanicoDpi.reset();
 mecanicoId = mecanico?.id_mecanico ?? null; modoMecanico = modo; focoMecanico = foco;
 nodoMecanico('formMecanico').reset();
 for (const key of camposMecanico) {
  const input = nodoMecanico('mecanico_' + key);
  input.value = mecanico?.[key] ?? ''; input.disabled = modo === 'vista';
 }
 nodoMecanico('mecanicoTitulo').textContent = modo === 'vista' ? 'Datos del mecanico' : modo === 'edicion' ? 'Editar mecanico' : 'Nuevo mecanico';
 nodoMecanico('mecanicoGuardar').hidden = modo === 'vista';
 nodoMecanico('modalMecanico').classList.toggle('is-readonly', modo === 'vista');
 nodoMecanico('modalMecanico').classList.add('is-open');
 nodoMecanico('modalMecanico').setAttribute('aria-hidden', 'false');
 nodoMecanico(modo === 'vista' ? 'mecanicoCerrar' : 'mecanico_nombre').focus();
}
function cerrarMecanico() {
 if (guardandoMecanico) return;
 validacionMecanicoDpi.reset();
 nodoMecanico('modalMecanico').classList.remove('is-open');
 nodoMecanico('modalMecanico').setAttribute('aria-hidden', 'true');
 (focoMecanico?.isConnected ? focoMecanico : nodoMecanico('mecanicoNuevo')).focus();
}
function accionMecanico(label, path, callback) {
 const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-action';
 button.setAttribute('aria-label',label); button.title = label;
 button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
 button.addEventListener('click', () => callback(button)); return button;
}
function renderMecanicos() {
 const q = normalizarMecanico(nodoMecanico('buscarMecanico').value.trim());
 const rows = mecanicos.filter(m => [m.nombre,m.dpi,m.correo].some(v => normalizarMecanico(v).includes(q)));
 nodoMecanico('totalMecanicos').textContent = mecanicos.length;
 nodoMecanico('tablaMecanicos').replaceChildren(...rows.map(m => {
  const tr = document.createElement('tr');
  for(const key of ['nombre','edad','dpi','correo','fecha_contratacion']) { const td = document.createElement('td'); td.textContent = m[key] ?? ''; tr.append(td); }
  const td = document.createElement('td'), actions = document.createElement('div'); td.className = 'vehicle-actions-cell'; actions.className = 'table-actions';
  actions.append(accionMecanico('Ver detalle de ' + m.nombre, 'M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12z M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0', b => abrirMecanico(m,'vista',b)));
  actions.append(accionMecanico('Editar ' + m.nombre, 'M12 20h9 M16 4l4 4L7 21H3v-4z', b => abrirMecanico(m,'edicion',b)));
  actions.append(accionMecanico('Eliminar ' + m.nombre, 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7', b => eliminarMecanico(m,b)));
  td.append(actions); tr.append(td); return tr;
 }));
 nodoMecanico('mecanicosEstado').textContent = rows.length ? rows.length + ' mecanicos encontrados' : 'No hay mecanicos con estos filtros.';
}
function renderIndicadoresMecanicos() {
 const id = nodoMecanico('filtroMecanicoOrdenes').value;
 const mecanico = mecanicos.find(m => String(m.id_mecanico) === id);
 const rows = id === 'todos' ? ordenesMecanicos : ordenesMecanicos.filter(o => Number(o.idMecanico) === Number(mecanico?.id_mecanico));
 nodoMecanico('totalOrdenesMecanicos').textContent = rows.length;
 nodoMecanico('nombreMecanicoIndicador').textContent = mecanico?.nombre || 'Todos los mecanicos';
 nodoMecanico('ordenesMecanicoSeleccionado').textContent = rows.length;
}
function idMecanicoDeOrden(orden) {
 const id = Number(orden.idMecanico);
 if (Number.isInteger(id) && id > 0 && mecanicos.some(m => Number(m.id_mecanico) === id)) return String(id);
 const nombre = normalizarMecanico(orden.mecanico);
 const mecanico = mecanicos.find(m => normalizarMecanico(m.nombre) === nombre);
 return mecanico ? String(mecanico.id_mecanico) : null;
}
function contarOrdenesPorMecanico(ordenes) {
 const conteos = new Map(mecanicos.map(m => [String(m.id_mecanico), {nombre:m.nombre, cantidad:0}]));
 for (const orden of ordenes) {
  const id = idMecanicoDeOrden(orden);
  if (id && conteos.has(id)) conteos.get(id).cantidad++;
 }
 return Array.from(conteos.values());
}
function aclararColorGrafica(hex, factor) {
 const valor = hex.replace('#', '');
 const canales = [0,2,4].map(indice => parseInt(valor.slice(indice, indice + 2), 16));
 return `rgb(${canales.map(canal => Math.round(canal + (255 - canal) * factor)).join(',')})`;
}
function oscurecerColorGrafica(hex, factor) {
 const valor = hex.replace('#', '');
 const canales = [0,2,4].map(indice => parseInt(valor.slice(indice, indice + 2), 16));
 return `rgb(${canales.map(canal => Math.round(canal * (1 - factor))).join(',')})`;
}
function dibujarGraficaPastel(canvas, leyenda, datos, titulo) {
 const rect = canvas.getBoundingClientRect();
 const size = Math.max(120, Math.min(190, rect.width || 190));
 const escala = window.devicePixelRatio || 1;
 canvas.width = Math.round(size * escala); canvas.height = Math.round(size * escala);
 canvas.style.height = `${size}px`;
 const context = canvas.getContext('2d');
 context.setTransform(escala, 0, 0, escala, 0, 0);
 const centro = size / 2, radio = size * .43;
 const total = datos.reduce((suma, item) => suma + item.cantidad, 0);
 context.clearRect(0, 0, size, size);
 if (!total) {
  context.beginPath(); context.arc(centro, centro, radio, 0, Math.PI * 2); context.fillStyle = 'rgba(148,163,184,.18)'; context.fill();
  context.fillStyle = '#cbd5e1'; context.font = '600 12px Segoe UI, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('Sin órdenes', centro, centro);
  canvas.setAttribute('aria-label', `${titulo}: sin ordenes registradas`);
 } else {
  let inicio = -Math.PI / 2;
  datos.forEach((item, index) => {
   if (!item.cantidad) return;
   const fin = inicio + Math.PI * 2 * item.cantidad / total;
   const separacion = .035;
   const inicioSeparado = inicio + separacion;
   const finSeparado = Math.max(inicioSeparado, fin - separacion);
   const medio = (inicioSeparado + finSeparado) / 2;
   const desplazamiento = 4;
   context.beginPath();
   context.moveTo(centro + Math.cos(medio) * desplazamiento, centro + Math.sin(medio) * desplazamiento);
   context.arc(centro + Math.cos(medio) * desplazamiento, centro + Math.sin(medio) * desplazamiento, radio, inicioSeparado, finSeparado);
   context.closePath();
   const tono = coloresGraficasMecanicos[index % coloresGraficasMecanicos.length];
   const brillo = context.createRadialGradient(centro * .76, centro * .68, 0, centro, centro, radio);
   brillo.addColorStop(0, aclararColorGrafica(tono, .34)); brillo.addColorStop(.38, tono); brillo.addColorStop(1, oscurecerColorGrafica(tono, .48));
   context.fillStyle = brillo; context.fill();
   inicio = fin;
  });
  canvas.setAttribute('aria-label', `${titulo}: ${datos.filter(item => item.cantidad).map(item => `${item.nombre}, ${item.cantidad}`).join('; ')}`);
 }
 leyenda.replaceChildren(...datos.map((item, index) => {
  const fila = document.createElement('li');
  const muestra = document.createElement('span'); muestra.className = 'mechanic-chart-swatch'; muestra.style.backgroundColor = coloresGraficasMecanicos[index % coloresGraficasMecanicos.length]; muestra.style.color = coloresGraficasMecanicos[index % coloresGraficasMecanicos.length];
  const nombre = document.createElement('span'); nombre.className = 'mechanic-chart-name'; nombre.textContent = item.nombre;
  const valor = document.createElement('span'); valor.className = 'mechanic-chart-value';
  const cantidad = document.createElement('strong'); cantidad.textContent = String(item.cantidad);
  const porcentaje = document.createElement('small'); porcentaje.textContent = total ? `${Math.round(item.cantidad / total * 100)}%` : '0%';
  valor.append(cantidad, porcentaje);
  fila.append(muestra, nombre, valor); return fila;
 }));
}
function renderGraficasMecanicos() {
 const estadosEnTrabajo = new Set(['Activa','Abierta','En proceso','Finalizada']);
 const enTrabajo = contarOrdenesPorMecanico(ordenesMecanicos.filter(orden => estadosEnTrabajo.has(orden.estado)));
 const hoy = new Date();
 const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
 const desde = nodoMecanico('filtroDesdeOrdenesEntregadas');
 const hasta = nodoMecanico('filtroHastaOrdenesEntregadas');
 const inicioMes = `${mesActual}-01`;
 const hoyTexto = `${mesActual}-${String(hoy.getDate()).padStart(2,'0')}`;
 if (!desde.value) desde.value = inicioMes;
 if (!hasta.value) hasta.value = hoyTexto;
 desde.max = hoyTexto; hasta.max = hoyTexto;
 if (desde.value > hasta.value) hasta.value = desde.value;
 const fechaDesde = desde.value || inicioMes;
 const fechaHasta = hasta.value || hoyTexto;
 periodoGraficaActual = mesActual;
 const entregadas = contarOrdenesPorMecanico(ordenesMecanicos.filter(orden => {
  if (orden.estado !== 'Entregado') return false;
  const fechaEntrega = String(orden.fechaEntrega || orden.fechaActualizacion || orden.fechaSalida || orden.fechaCreacion || '').slice(0,10);
  return fechaEntrega >= fechaDesde && fechaEntrega <= fechaHasta;
 }));
 const totalTrabajo = enTrabajo.reduce((suma, item) => suma + item.cantidad, 0);
 const totalEntregadas = entregadas.reduce((suma, item) => suma + item.cantidad, 0);
 nodoMecanico('totalOrdenesEnTrabajoGrafica').textContent = totalTrabajo;
 nodoMecanico('totalOrdenesEntregadasGrafica').textContent = totalEntregadas;
 const fechaCorta = valor => new Date(`${valor}T12:00:00`).toLocaleDateString('es-GT', {day:'2-digit',month:'short',year:'numeric'});
 nodoMecanico('periodoOrdenesEntregadas').textContent = `${fechaCorta(fechaDesde)} – ${fechaCorta(fechaHasta)}`;
 dibujarGraficaPastel(nodoMecanico('graficaOrdenesEnTrabajo'), nodoMecanico('leyendaOrdenesEnTrabajo'), enTrabajo, 'Ordenes en trabajo');
 dibujarGraficaPastel(nodoMecanico('graficaOrdenesEntregadas'), nodoMecanico('leyendaOrdenesEntregadas'), entregadas, 'Ordenes entregadas este mes');
}
function cargarFiltroMecanicos() {
 const select = nodoMecanico('filtroMecanicoOrdenes');
 const anterior = select.value;
 const todos = document.createElement('option'); todos.value = 'todos'; todos.textContent = 'Todos los mecanicos';
 select.replaceChildren(todos, ...mecanicos.map(m => {
  const option = document.createElement('option'); option.value = String(m.id_mecanico); option.textContent = m.nombre; return option;
 }));
 select.value = mecanicos.some(m => String(m.id_mecanico) === anterior) ? anterior : 'todos';
 select.disabled = false;
 renderIndicadoresMecanicos();
}
async function cargarMecanicos() {
 nodoMecanico('mecanicoNuevo').disabled = true;
 nodoMecanico('mecanicosEstado').textContent = 'Cargando mecanicos...';
 try {
  [mecanicos, ordenesMecanicos] = await Promise.all([window.api.mecanicos.list(), window.api.ordenes.list()]);
  renderMecanicos(); cargarFiltroMecanicos(); renderGraficasMecanicos(); nodoMecanico('mecanicoNuevo').disabled = false;
 }
 catch(e) { ordenesMecanicos = []; nodoMecanico('filtroMecanicoOrdenes').disabled = true; nodoMecanico('totalOrdenesMecanicos').textContent = '--'; nodoMecanico('ordenesMecanicoSeleccionado').textContent = '--'; mecanicos = []; renderMecanicos(); renderGraficasMecanicos(); nodoMecanico('totalMecanicos').textContent = '--'; nodoMecanico('mecanicosEstado').textContent = 'No se pudieron cargar los mecanicos. Vuelve a abrir el modulo.'; }
}
async function eliminarMecanico(mecanico, button) {
 if (button.disabled) return;
 button.disabled = true;
 try {
  if (!await window.ui.confirm('Eliminar al mecanico ' + mecanico.nombre + '?', {title:'Eliminar mecanico',confirmText:'Eliminar',tone:'danger'})) return;
  await window.api.mecanicos.remove(mecanico.id_mecanico); await cargarMecanicos();
 } catch(e) { await window.ui.alert(e.message); } finally { button.disabled = false; }
}
nodoMecanico('formMecanico').addEventListener('submit', async event => {
 event.preventDefault(); if (guardandoMecanico || modoMecanico === 'vista') return;
 guardandoMecanico = true; nodoMecanico('mecanicoGuardar').disabled = true;
 let guardado = false;
 try {
  if (!await validacionMecanicoDpi.validate() || !nodoMecanico('formMecanico').reportValidity()) return;
  const data = Object.fromEntries(camposMecanico.map(key => [key,nodoMecanico('mecanico_'+key).value.trim()]));
  await window.api.mecanicos.save(mecanicoId,data); guardado = true; await cargarMecanicos();
 } catch(e) { await window.ui.alert('No se pudo guardar el mecanico: ' + e.message); }
 finally { guardandoMecanico = false; nodoMecanico('mecanicoGuardar').disabled = false; if (guardado) cerrarMecanico(); }
});
nodoMecanico('mecanicoNuevo').addEventListener('click', () => abrirMecanico());
nodoMecanico('mecanicoCerrar').addEventListener('click', cerrarMecanico);
nodoMecanico('mecanicoBackdrop').addEventListener('click', cerrarMecanico);
nodoMecanico('filtroMecanicoOrdenes').addEventListener('change', renderIndicadoresMecanicos);
nodoMecanico('buscarMecanico').addEventListener('input', renderMecanicos);
nodoMecanico('filtroDesdeOrdenesEntregadas').addEventListener('change', renderGraficasMecanicos);
nodoMecanico('filtroHastaOrdenesEntregadas').addEventListener('change', renderGraficasMecanicos);
window.setInterval(() => {
 const ahora = new Date();
 const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}`;
 if (periodoGraficaActual && periodo !== periodoGraficaActual) {
  nodoMecanico('filtroDesdeOrdenesEntregadas').value = `${periodo}-01`;
  nodoMecanico('filtroHastaOrdenesEntregadas').value = `${periodo}-${String(ahora.getDate()).padStart(2,'0')}`;
  renderGraficasMecanicos();
 }
}, 60000);
document.addEventListener('keydown', event => {
 if (!nodoMecanico('modalMecanico').classList.contains('is-open')) return;
 if (event.key === 'Escape') cerrarMecanico();
 if (event.key === 'Tab') {
  const fields = Array.from(nodoMecanico('modalMecanico').querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled])'));
  const first = fields[0], last = fields[fields.length-1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
 }
});
cargarMecanicos();
