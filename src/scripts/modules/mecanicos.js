let mecanicos = [], mecanicoId = null, modoMecanico = 'nuevo', guardandoMecanico = false;
let focoMecanico;
let ordenesMecanicos = [];
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
  renderMecanicos(); cargarFiltroMecanicos(); nodoMecanico('mecanicoNuevo').disabled = false;
 }
 catch(e) { ordenesMecanicos = []; nodoMecanico('filtroMecanicoOrdenes').disabled = true; nodoMecanico('totalOrdenesMecanicos').textContent = '--'; nodoMecanico('ordenesMecanicoSeleccionado').textContent = '--'; mecanicos = []; renderMecanicos(); nodoMecanico('totalMecanicos').textContent = '--'; nodoMecanico('mecanicosEstado').textContent = 'No se pudieron cargar los mecanicos. Vuelve a abrir el modulo.'; }
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
