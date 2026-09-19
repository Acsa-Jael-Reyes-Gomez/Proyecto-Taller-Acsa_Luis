const tablaOrdenesTrabajo = document.getElementById('tablaOrdenesTrabajo');
const buscarOrdenTrabajo = document.getElementById('buscarOrdenTrabajo');
const filtroEstadoOrdenTrabajo = document.getElementById('filtroEstadoOrdenTrabajo');
const formOrdenTrabajo = document.getElementById('formOrdenTrabajo');
const btnNuevaOrdenTrabajo = document.getElementById('btnNuevaOrdenTrabajo');
const modalOrdenTrabajo = document.getElementById('modalOrdenTrabajo');
const btnCerrarOrdenTrabajo = document.getElementById('btnCerrarOrdenTrabajo');
const btnGuardarOrdenTrabajo = document.getElementById('btnGuardarOrdenTrabajo');
const ordenTrabajoModo = document.getElementById('ordenTrabajoModo');
const totalOrdenesTrabajo = document.getElementById('totalOrdenesTrabajo');
const ordenesAbiertas = document.getElementById('ordenesAbiertas');
const ordenesProceso = document.getElementById('ordenesProceso');
const ordenesFinalizadas = document.getElementById('ordenesFinalizadas');
const totalRepuestosOrdenes = document.getElementById('totalRepuestosOrdenes');
const ordenPlaca = document.getElementById('ordenPlaca');
const ordenPlacasList = document.getElementById('ordenPlacasList');
const ordenPilotosList = document.getElementById('ordenPilotosList');
const ordenMecanicosList = document.getElementById('ordenMecanicosList');
const ordenRepuestoBusqueda = document.getElementById('ordenRepuestoBusqueda');
const ordenRepuestoExistencia = document.getElementById('ordenRepuestoExistencia');
const ordenRepuestoCantidad = document.getElementById('ordenRepuestoCantidad');
const btnAgregarRepuestoOrden = document.getElementById('btnAgregarRepuestoOrden');
const ordenRepuestosInventarioList = document.getElementById('ordenRepuestosInventarioList');
const tablaRepuestosOrden = document.getElementById('tablaRepuestosOrden');
const ordenFormFields = Array.from(formOrdenTrabajo.querySelectorAll('input, select, textarea'));
const ordenTotalManoObra = document.getElementById('ordenTotalManoObra');
const ordenTotalRepuestosInput = document.getElementById('ordenTotalRepuestos');
const ordenHoraEntrada = document.getElementById('ordenHoraEntrada');
const ordenHoraSalida = document.getElementById('ordenHoraSalida');

let modoOrdenTrabajo = 'nuevo';
let repuestosOrdenActual = [];
let repuestoEditandoIndex = null;
let ordenSeleccionadaId = null;

const catalogoVehiculos = [
    {
        placa: 'C-842BVK',
        vehiculo: 'Freightliner M2',
        marca: 'Freightliner',
        piloto: 'Luis Morales',
        mecanico: 'Juan Perez',
        departamento: 'Taller',
        tipoVehiculo: 'Camion',
        kilometraje: 184200
    },
    {
        placa: 'P-190FRT',
        vehiculo: 'Hino 500',
        marca: 'Hino',
        piloto: 'Carlos Perez',
        mecanico: 'Mario Lopez',
        departamento: 'Frenos',
        tipoVehiculo: 'Pickup',
        kilometraje: 96450
    },
    {
        placa: 'C-377KLM',
        vehiculo: 'International 4300',
        marca: 'International',
        piloto: 'Mario Lopez',
        mecanico: 'Edwin Garcia',
        departamento: 'Mecanica',
        tipoVehiculo: 'Camion',
        kilometraje: 211780
    },
    {
        placa: 'C-555NQP',
        vehiculo: 'Kenworth T370',
        marca: 'Kenworth',
        piloto: 'Sin asignar',
        mecanico: 'Juan Perez',
        departamento: 'Taller',
        tipoVehiculo: 'Cabezal',
        kilometraje: 143010
    }
];

const inventarioRepuestos = [
    {
        codigo: 'FIL-ACE-001',
        nombre: 'Filtro de aceite',
        existencia: 12,
        costo: 75
    },
    {
        codigo: 'ACE-15W40',
        nombre: 'Aceite 15W40',
        existencia: 36,
        costo: 95
    },
    {
        codigo: 'BOM-H4-001',
        nombre: 'Bombilla frontal H4',
        existencia: 18,
        costo: 45
    },
    {
        codigo: 'PAS-FRE-DEL',
        nombre: 'Pastillas de freno delanteras',
        existencia: 8,
        costo: 680
    },
    {
        codigo: 'LIQ-FRE-DOT3',
        nombre: 'Liquido de frenos DOT3',
        existencia: 14,
        costo: 90
    },
    {
        codigo: 'FAJ-MOT-001',
        nombre: 'Faja de motor',
        existencia: 6,
        costo: 160
    },
    {
        codigo: 'LLA-DEL-295',
        nombre: 'Llanta delantera 295/80R22.5',
        existencia: 4,
        costo: 1850
    }
];

const ordenesTrabajo = [
    {
        numero: '5451',
        serie: 'Serie A',
        fechaEntrada: '2026-06-16',
        horaEntrada: '08:15',
        periodoEntrada: 'AM',
        fechaSalida: '',
        horaSalida: '',
        periodoSalida: 'PM',
        vehiculo: 'Freightliner M2',
        placa: 'C-842BVK',
        piloto: 'Luis Morales',
        marca: 'Freightliner',
        mecanico: 'Juan Perez',
        departamento: 'Taller',
        kilometraje: 184200,
        proximoServicio: 'Cambio de aceite en 5,000 km',
        tipoVehiculo: 'Camion',
        estado: 'En proceso',
        manoMecanico: 350,
        manoElectronico: 0,
        manoPintura: 0,
        totalManoObra: 350,
        totalRepuestos: 475,
        trabajos: 'Cambio de aceite, revision de frenos y ajuste de luces.',
        repuestos: [
            {
                codigo: 'FIL-ACE-001',
                nombre: 'Filtro de aceite',
                existencia: 12,
                cantidad: 1,
                costo: 75
            },
            {
                codigo: 'ACE-15W40',
                nombre: 'Aceite 15W40',
                existencia: 36,
                cantidad: 4,
                costo: 95
            },
            {
                codigo: 'BOM-H4-001',
                nombre: 'Bombilla frontal H4',
                existencia: 18,
                cantidad: 1,
                costo: 20
            }
        ],
        observaciones: 'Unidad queda pendiente de prueba en ruta.'
    },
    {
        numero: '5452',
        serie: 'Serie A',
        fechaEntrada: '2026-06-15',
        horaEntrada: '10:30',
        periodoEntrada: 'AM',
        fechaSalida: '2026-06-15',
        horaSalida: '16:20',
        periodoSalida: 'PM',
        vehiculo: 'Hino 500',
        placa: 'P-190FRT',
        piloto: 'Carlos Perez',
        marca: 'Hino',
        mecanico: 'Mario Lopez',
        departamento: 'Frenos',
        kilometraje: 96450,
        proximoServicio: 'Revision en 2,000 km',
        tipoVehiculo: 'Pickup',
        estado: 'Finalizada',
        manoMecanico: 500,
        manoElectronico: 0,
        manoPintura: 0,
        totalManoObra: 500,
        totalRepuestos: 860,
        trabajos: 'Cambio de pastillas delanteras y purga de sistema.',
        repuestos: [
            {
                codigo: 'PAS-FRE-DEL',
                nombre: 'Pastillas de freno delanteras',
                existencia: 8,
                cantidad: 1,
                costo: 680
            },
            {
                codigo: 'LIQ-FRE-DOT3',
                nombre: 'Liquido de frenos DOT3',
                existencia: 14,
                cantidad: 2,
                costo: 90
            }
        ],
        observaciones: 'Se entrega unidad con freno probado.'
    },
    {
        numero: '5453',
        serie: 'Serie A',
        fechaEntrada: '2026-06-16',
        horaEntrada: '13:05',
        periodoEntrada: 'PM',
        fechaSalida: '',
        horaSalida: '',
        periodoSalida: 'PM',
        vehiculo: 'International 4300',
        placa: 'C-377KLM',
        piloto: 'Mario Lopez',
        marca: 'International',
        mecanico: 'Edwin Garcia',
        departamento: 'Mecanica',
        kilometraje: 211780,
        proximoServicio: 'Alineacion programada',
        tipoVehiculo: 'Camion',
        estado: 'Abierta',
        manoMecanico: 0,
        manoElectronico: 0,
        manoPintura: 0,
        totalManoObra: 0,
        totalRepuestos: 0,
        trabajos: 'Diagnostico inicial por vibracion en ruta.',
        repuestos: [],
        observaciones: 'Pendiente asignacion de mecanico.'
    }
];

function getOrdenFieldValue(id) {
    return document.getElementById(id).value.trim();
}

function setOrdenFieldValue(id, value = '') {
    document.getElementById(id).value = value || '';
}

function setOrdenChecked(id, value = false) {
    document.getElementById(id).checked = Boolean(value);
}

function formatCurrency(value) {
    return `Q${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function formatFecha(value) {
    if (!value) {
        return 'Sin fecha';
    }

    const [year, month, day] = value.split('-');

    return `${day}/${month}/${year}`;
}

function formatHora(value, periodo = '') {
    if (!value) {
        return '';
    }

    return `${value} ${periodo}`.trim();
}

function formatHourValue(value) {
    return String(Number(value)).padStart(2, '0');
}

function normalizeMinuteValue(value, complete = false) {
    const minuteDigits = value.slice(0, 2);

    if (!minuteDigits) {
        return complete ? '00' : '';
    }

    if (minuteDigits.length === 1) {
        if (Number(minuteDigits) > 5) {
            return `0${minuteDigits}`;
        }

        return complete ? `${minuteDigits}0` : minuteDigits;
    }

    const minute = Math.min(Number(minuteDigits), 59);

    return String(minute).padStart(2, '0');
}

function splitTimeDigits(value) {
    const [rawHour = '', rawMinute = ''] = value.replace(/[^\d:]/g, '').split(':');
    const hourDigits = rawHour.slice(0, 2);
    const minuteDigits = rawMinute.slice(0, 2);

    if (!hourDigits) {
        return { hour: '', minute: minuteDigits };
    }

    if (hourDigits === '0') {
        return { hour: '', minute: minuteDigits };
    }

    if (/^0[1-9]$/.test(hourDigits)) {
        return { hour: hourDigits.charAt(1), minute: minuteDigits };
    }

    if (Number(hourDigits) >= 1 && Number(hourDigits) <= 12) {
        return { hour: hourDigits, minute: minuteDigits };
    }

    return {
        hour: hourDigits.charAt(0),
        minute: `${hourDigits.slice(1)}${minuteDigits}`.slice(0, 2)
    };
}

function normalizeTimeValue(value, complete = false) {
    const cleanedValue = value.replace(/[^\d:]/g, '').slice(0, 5);

    if (!cleanedValue) {
        return '';
    }

    if (cleanedValue.includes(':')) {
        const { hour, minute } = splitTimeDigits(cleanedValue);

        if (!hour) {
            return '';
        }

        return `${formatHourValue(hour)}:${normalizeMinuteValue(minute, complete)}`;
    }

    const digits = cleanedValue.slice(0, 4);

    if (!digits) {
        return '';
    }

    if (digits.startsWith('0')) {
        if (digits.length === 1) {
            return complete ? '' : '0';
        }

        return `${formatHourValue(digits.charAt(1))}:${normalizeMinuteValue(digits.slice(2), complete)}`;
    }

    if (digits.charAt(0) === '1' && digits.length === 1 && !complete) {
        return '1';
    }

    if (digits.charAt(0) === '1' && /^[0-2]$/.test(digits.charAt(1) || '')) {
        return `${digits.slice(0, 2)}:${normalizeMinuteValue(digits.slice(2), complete)}`;
    }

    return `${formatHourValue(digits.charAt(0))}:${normalizeMinuteValue(digits.slice(1), complete)}`;
}

function assistTimeInput(input, complete = false) {
    const formattedValue = normalizeTimeValue(input.value, complete);

    input.setCustomValidity('');

    if (input.value !== formattedValue) {
        input.value = formattedValue;
    }
}

function validateTimeInput(input) {
    assistTimeInput(input, true);

    if (input.required && !input.value) {
        input.setCustomValidity('Ingrese una hora valida del 1 al 12.');
        input.reportValidity();
        return false;
    }

    input.setCustomValidity('');
    return true;
}

function getTimeDigitIndex(value, position) {
    return value.slice(0, position).replace(/\D/g, '').length;
}

function setTimeValueFromDigits(input, digits, cursorDigitIndex = null, complete = false) {
    const safeDigits = digits.slice(0, 4);

    input.value = normalizeTimeValue(safeDigits, complete);

    if (cursorDigitIndex === null || document.activeElement !== input) {
        return;
    }

    if (cursorDigitIndex >= safeDigits.length) {
        input.setSelectionRange(input.value.length, input.value.length);
        return;
    }

    const safeDigitIndex = Math.max(0, Math.min(cursorDigitIndex, input.value.replace(/\D/g, '').length));
    let currentDigitIndex = 0;
    let cursorPosition = input.value.length;

    for (let index = 0; index < input.value.length; index += 1) {
        if (/\d/.test(input.value.charAt(index))) {
            if (currentDigitIndex === safeDigitIndex) {
                cursorPosition = index;
                break;
            }

            currentDigitIndex += 1;
        }
    }

    input.setSelectionRange(cursorPosition, cursorPosition);
}

function handleTimeKeydown(event) {
    const allowedKeys = [
        'Tab',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End'
    ];

    if (event.ctrlKey || event.metaKey || allowedKeys.includes(event.key)) {
        return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();

        const input = event.target;
        const digits = input.value.replace(/\D/g, '');
        let startIndex = getTimeDigitIndex(input.value, input.selectionStart);
        let endIndex = getTimeDigitIndex(input.value, input.selectionEnd);

        if (startIndex === endIndex) {
            if (event.key === 'Backspace') {
                startIndex = Math.max(0, startIndex - 1);
            } else {
                endIndex = Math.min(digits.length, endIndex + 1);
            }
        }

        const nextDigits = `${digits.slice(0, startIndex)}${digits.slice(endIndex)}`;
        setTimeValueFromDigits(input, nextDigits, startIndex);
        return;
    }

    if (/^\d$/.test(event.key)) {
        event.preventDefault();

        const input = event.target;
        const digits = input.value.replace(/\D/g, '');
        const startIndex = getTimeDigitIndex(input.value, input.selectionStart);
        const endIndex = getTimeDigitIndex(input.value, input.selectionEnd);
        const nextDigits = `${digits.slice(0, startIndex)}${event.key}${digits.slice(endIndex)}`;

        setTimeValueFromDigits(input, nextDigits, startIndex + 1);
        return;
    }

    event.preventDefault();
}

function handleTimePaste(event) {
    event.preventDefault();

    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '');

    if (!pastedDigits) {
        return;
    }

    const input = event.target;
    const digits = input.value.replace(/\D/g, '');
    const startIndex = getTimeDigitIndex(input.value, input.selectionStart);
    const endIndex = getTimeDigitIndex(input.value, input.selectionEnd);
    const nextDigits = `${digits.slice(0, startIndex)}${pastedDigits}${digits.slice(endIndex)}`;

    setTimeValueFromDigits(input, nextDigits, startIndex + pastedDigits.length);
}


function formatPlateInput(value) {
    const normalized = value.toUpperCase().replace(/\s+/g, '');

    if (/^[A-Z]$/.test(normalized)) {
        return `${normalized}-`;
    }

    if (/^[A-Z][^-]/.test(normalized)) {
        return `${normalized.charAt(0)}-${normalized.slice(1)}`;
    }

    return normalized;
}

function renderDatalistOptions(listElement, values) {
    listElement.innerHTML = [...new Set(values.filter(Boolean))].map((value) => (
        `<option value="${value}"></option>`
    )).join('');
}

function renderOrdenDatalists() {
    renderDatalistOptions(ordenPlacasList, catalogoVehiculos.map((vehiculo) => vehiculo.placa));
    renderDatalistOptions(ordenPilotosList, catalogoVehiculos.map((vehiculo) => vehiculo.piloto));
    renderDatalistOptions(ordenMecanicosList, catalogoVehiculos.map((vehiculo) => vehiculo.mecanico));
    renderDatalistOptions(ordenRepuestosInventarioList, inventarioRepuestos.map((repuesto) => `${repuesto.codigo} - ${repuesto.nombre}`));
}

function mapVehiculoCatalogo(vehiculo) {
    return {
        placa: vehiculo.placa,
        vehiculo: vehiculo.modelo || vehiculo.modeloRegistro || [vehiculo.marca, vehiculo.linea].filter(Boolean).join(' '),
        marca: vehiculo.marca,
        piloto: vehiculo.piloto,
        mecanico: '',
        departamento: '',
        tipoVehiculo: vehiculo.tipo,
        kilometraje: vehiculo.kilometraje
    };
}

function reemplazarContenido(array, values) {
    array.splice(0, array.length, ...values);
}

function buscarRepuestoInventario(value) {
    const normalized = value.trim().toLowerCase();

    return inventarioRepuestos.find((repuesto) => (
        repuesto.codigo.toLowerCase() === normalized
        || repuesto.nombre.toLowerCase() === normalized
        || `${repuesto.codigo} - ${repuesto.nombre}`.toLowerCase() === normalized
    ));
}

function actualizarExistenciaRepuesto() {
    const repuesto = buscarRepuestoInventario(ordenRepuestoBusqueda.value);

    if (!repuesto) {
        ordenRepuestoExistencia.value = '';
        ordenRepuestoCantidad.removeAttribute('max');
        return;
    }

    ordenRepuestoExistencia.value = `${repuesto.existencia} unidades`;
    ordenRepuestoCantidad.max = repuesto.existencia;

    if (!ordenRepuestoCantidad.value || Number(ordenRepuestoCantidad.value) < 1) {
        ordenRepuestoCantidad.value = 1;
    }
}

function normalizarRepuestosOrden(repuestos) {
    if (!Array.isArray(repuestos)) {
        return [];
    }

    return repuestos.map((repuesto) => ({
        idRepuesto: repuesto.idRepuesto || repuesto.id,
        codigo: repuesto.codigo,
        nombre: repuesto.nombre,
        existencia: Number(repuesto.existencia) || 0,
        cantidad: Number(repuesto.cantidad) || 1,
        cantidadTexto: repuesto.cantidadTexto || String(repuesto.cantidad || 1),
        costo: Number(repuesto.costo) || 0
    }));
}

function parseCantidadRepuesto(value) {
    const rawValue = String(value || '').trim().replace(',', '.');

    if (!rawValue) {
        return null;
    }

    if (/^\d+\/\d+$/.test(rawValue)) {
        const [numerator, denominator] = rawValue.split('/').map(Number);

        if (denominator === 0 || numerator <= 0) {
            return null;
        }

        return {
            valor: numerator / denominator,
            texto: rawValue
        };
    }

    if (/^\d+(\.\d+)?$/.test(rawValue)) {
        const numericValue = Number(rawValue);

        if (numericValue <= 0) {
            return null;
        }

        return {
            valor: numericValue,
            texto: rawValue
        };
    }

    return null;
}

function formatCantidadRepuesto(repuesto) {
    return repuesto.cantidadTexto || String(repuesto.cantidad || 0);
}

function calcularTotalRepuestos() {
    return repuestosOrdenActual.reduce((total, repuesto) => (
        total + (Number(repuesto.cantidad) || 0) * (Number(repuesto.costo) || 0)
    ), 0);
}

function actualizarTotalRepuestos() {
    const total = calcularTotalRepuestos();

    ordenTotalRepuestosInput.value = total ? total.toFixed(2) : '';
}

function renderRepuestosOrden() {
    if (repuestosOrdenActual.length === 0) {
        tablaRepuestosOrden.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">No hay repuestos agregados.</td>
            </tr>
        `;
        actualizarTotalRepuestos();
        return;
    }

    tablaRepuestosOrden.innerHTML = repuestosOrdenActual.map((repuesto, index) => {
        const isEditing = repuestoEditandoIndex === index && modoOrdenTrabajo !== 'vista';
        const quantityCell = isEditing
            ? `<input class="js-cantidad-repuesto" type="text" value="${escapeHtml(formatCantidadRepuesto(repuesto))}" data-index="${index}" aria-label="Cantidad de ${escapeHtml(repuesto.nombre)}">`
            : escapeHtml(formatCantidadRepuesto(repuesto));
        const actionCell = modoOrdenTrabajo === 'vista'
            ? '<span class="parts-readonly-action">Solo lectura</span>'
            : isEditing
            ? `
                <button class="parts-edit-button js-guardar-cantidad" type="button" data-index="${index}">Guardar</button>
                <button class="parts-ghost-button js-cancelar-cantidad" type="button" data-index="${index}">Cancelar</button>
            `
            : `
                <button class="parts-edit-button js-modificar-repuesto" type="button" data-index="${index}">Modificar</button>
                <button class="parts-remove-button js-quitar-repuesto" type="button" data-index="${index}" aria-label="Quitar ${escapeHtml(repuesto.nombre)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6l12 12"></path>
                        <path d="M18 6L6 18"></path>
                    </svg>
                </button>
            `;

        return `
            <tr>
                <td>${escapeHtml(repuesto.codigo)}</td>
                <td>${escapeHtml(repuesto.nombre)}</td>
                <td>${Number(repuesto.existencia) || 0}</td>
                <td>${quantityCell}</td>
                <td>${formatCurrency(repuesto.costo)}</td>
                <td><div class="parts-actions">${actionCell}</div></td>
            </tr>
        `;
    }).join('');

    actualizarTotalRepuestos();
}

function agregarRepuestoOrden() {
    const repuesto = buscarRepuestoInventario(ordenRepuestoBusqueda.value);

    if (!repuesto) {
        alert('Selecciona un repuesto del inventario.');
        ordenRepuestoBusqueda.focus();
        return;
    }

    const cantidad = parseCantidadRepuesto(ordenRepuestoCantidad.value);

    if (!cantidad) {
        alert('Ingresa una cantidad valida. Puedes usar enteros, decimales o fracciones como 1/2.');
        ordenRepuestoCantidad.focus();
        return;
    }

    const repuestoAgregado = repuestosOrdenActual.find((item) => item.codigo === repuesto.codigo);
    const cantidadActual = repuestoAgregado ? Number(repuestoAgregado.cantidad) || 0 : 0;

    if (cantidadActual + cantidad.valor > repuesto.existencia) {
        alert('No hay suficiente existencia disponible para agregar esa cantidad.');
        ordenRepuestoCantidad.focus();
        return;
    }

    if (repuestoAgregado) {
        repuestoAgregado.cantidad = cantidadActual + cantidad.valor;
        repuestoAgregado.cantidadTexto = String(repuestoAgregado.cantidad);
    } else {
        repuestosOrdenActual.push({
            idRepuesto: repuesto.id,
            codigo: repuesto.codigo,
            nombre: repuesto.nombre,
            existencia: repuesto.existencia,
            cantidad: cantidad.valor,
            cantidadTexto: cantidad.texto,
            costo: repuesto.costo
        });
    }

    ordenRepuestoBusqueda.value = '';
    ordenRepuestoExistencia.value = '';
    ordenRepuestoCantidad.value = 1;
    renderRepuestosOrden();
    ordenRepuestoBusqueda.focus();
}

function buscarVehiculoPorPlaca(placa) {
    const normalized = formatPlateInput(placa);

    return catalogoVehiculos.find((vehiculo) => vehiculo.placa === normalized);
}

function autocompletarVehiculoPorPlaca() {
    const vehiculo = buscarVehiculoPorPlaca(ordenPlaca.value);

    if (!vehiculo) {
        return;
    }

    setOrdenFieldValue('ordenVehiculo', vehiculo.vehiculo);
    setOrdenFieldValue('ordenMarca', vehiculo.marca);
    setOrdenFieldValue('ordenDepartamento', vehiculo.departamento);
    setOrdenFieldValue('ordenTipoVehiculo', vehiculo.tipoVehiculo);
    setOrdenFieldValue('ordenKilometraje', vehiculo.kilometraje);
    setOrdenFieldValue('ordenPiloto', vehiculo.piloto);
    setOrdenFieldValue('ordenMecanico', vehiculo.mecanico);
}

function applyPlateFormat(input) {
    if (input.dataset.skipPlateFormat === 'true') {
        input.dataset.skipPlateFormat = 'false';
        input.value = input.value.toUpperCase().replace(/\s+/g, '');
        return;
    }

    const formattedValue = formatPlateInput(input.value);

    if (input.value !== formattedValue) {
        input.value = formattedValue;
    }
}

function handlePlateKeydown(event) {
    if (event.key === 'Backspace' || event.key === 'Delete') {
        if (!event.target.value) {
            event.target.dataset.skipPlateFormat = 'false';
            return;
        }

        if (/^[A-Z]-$/.test(event.target.value.toUpperCase())) {
            event.preventDefault();
            event.target.value = '';
            event.target.dataset.skipPlateFormat = 'false';

            if (event.target === buscarOrdenTrabajo) {
                renderOrdenesTrabajo();
            }

            return;
        }

        event.target.dataset.skipPlateFormat = 'true';
        return;
    }

    event.target.dataset.skipPlateFormat = 'false';
}

function getEstadoClass(estado) {
    if (estado === 'Finalizada') {
        return 'normal';
    }

    if (estado === 'En proceso') {
        return 'medium';
    }

    return 'high';
}

function setOrdenSoloLectura(isReadOnly) {
    ordenFormFields.forEach((field) => {
        field.disabled = isReadOnly;
    });

    btnGuardarOrdenTrabajo.hidden = isReadOnly;
    btnAgregarRepuestoOrden.hidden = isReadOnly;
    modalOrdenTrabajo.classList.toggle('is-readonly', isReadOnly);
    ordenTrabajoModo.innerText = isReadOnly ? 'Detalle' : modoOrdenTrabajo === 'edicion' ? 'Edicion' : 'Registro';
    renderRepuestosOrden();
}

function limpiarOrdenTrabajo() {
    formOrdenTrabajo.reset();
    ordenSeleccionadaId = null;
    ordenTotalManoObra.value = '';
    repuestosOrdenActual = [];
    repuestoEditandoIndex = null;
    ordenRepuestoExistencia.value = '';
    ordenRepuestoCantidad.value = 1;
    renderRepuestosOrden();
}

function abrirRegistroOrdenTrabajo() {
    modoOrdenTrabajo = 'nuevo';
    ordenSeleccionadaId = null;
    setOrdenSoloLectura(false);
    limpiarOrdenTrabajo();
    setOrdenSoloLectura(false);

    modalOrdenTrabajo.classList.add('is-open');
    modalOrdenTrabajo.setAttribute('aria-hidden', 'false');
    document.getElementById('ordenNumero').focus();
}

function ocultarOrdenTrabajo() {
    modalOrdenTrabajo.classList.remove('is-open');
    modalOrdenTrabajo.setAttribute('aria-hidden', 'true');
    btnNuevaOrdenTrabajo.focus();
}

function cargarOrdenEnFormulario(orden) {
    setOrdenFieldValue('ordenFechaEntrada', orden.fechaEntrada);
    setOrdenFieldValue('ordenHoraEntrada', orden.horaEntrada);
    setOrdenFieldValue('ordenPeriodoEntrada', orden.periodoEntrada || 'AM');
    setOrdenFieldValue('ordenFechaSalida', orden.fechaSalida);
    setOrdenFieldValue('ordenHoraSalida', orden.horaSalida);
    setOrdenFieldValue('ordenPeriodoSalida', orden.periodoSalida || 'PM');
    setOrdenFieldValue('ordenNumero', orden.numero);
    setOrdenFieldValue('ordenSerie', orden.serie);
    setOrdenFieldValue('ordenVehiculo', orden.vehiculo);
    setOrdenFieldValue('ordenPlaca', orden.placa);
    setOrdenFieldValue('ordenPiloto', orden.piloto);
    setOrdenFieldValue('ordenMarca', orden.marca);
    setOrdenFieldValue('ordenMecanico', orden.mecanico);
    setOrdenFieldValue('ordenDepartamento', orden.departamento);
    setOrdenFieldValue('ordenKilometraje', orden.kilometraje);
    setOrdenFieldValue('ordenProximoServicio', orden.proximoServicio);
    setOrdenFieldValue('ordenTipoVehiculo', orden.tipoVehiculo);
    setOrdenChecked('ordenManoMecanico', orden.manoMecanico);
    setOrdenChecked('ordenManoElectronico', orden.manoElectronico);
    setOrdenChecked('ordenManoPintura', orden.manoPintura);
    setOrdenFieldValue('ordenTrabajos', orden.trabajos);
    setOrdenFieldValue('ordenObservaciones', orden.observaciones);
    setOrdenFieldValue('ordenTotalManoObra', orden.totalManoObra);
    repuestosOrdenActual = normalizarRepuestosOrden(orden.repuestos);
    repuestoEditandoIndex = null;
    renderRepuestosOrden();
}

function getOrdenFormulario() {
    const ordenActual = ordenesTrabajo.find((orden) => orden.id === ordenSeleccionadaId);

    return {
        numero: getOrdenFieldValue('ordenNumero'),
        serie: getOrdenFieldValue('ordenSerie') || 'Serie A',
        fechaEntrada: document.getElementById('ordenFechaEntrada').value,
        horaEntrada: getOrdenFieldValue('ordenHoraEntrada'),
        periodoEntrada: document.getElementById('ordenPeriodoEntrada').value,
        fechaSalida: document.getElementById('ordenFechaSalida').value,
        horaSalida: getOrdenFieldValue('ordenHoraSalida'),
        periodoSalida: document.getElementById('ordenPeriodoSalida').value,
        vehiculo: getOrdenFieldValue('ordenVehiculo'),
        placa: formatPlateInput(getOrdenFieldValue('ordenPlaca')),
        piloto: getOrdenFieldValue('ordenPiloto'),
        marca: getOrdenFieldValue('ordenMarca'),
        mecanico: getOrdenFieldValue('ordenMecanico'),
        departamento: getOrdenFieldValue('ordenDepartamento'),
        kilometraje: Number(getOrdenFieldValue('ordenKilometraje')) || 0,
        proximoServicio: getOrdenFieldValue('ordenProximoServicio'),
        tipoVehiculo: document.getElementById('ordenTipoVehiculo').value,
        estado: modoOrdenTrabajo === 'edicion' ? ordenActual?.estado || 'Abierta' : 'Abierta',
        manoMecanico: document.getElementById('ordenManoMecanico').checked,
        manoElectronico: document.getElementById('ordenManoElectronico').checked,
        manoPintura: document.getElementById('ordenManoPintura').checked,
        totalManoObra: Number(getOrdenFieldValue('ordenTotalManoObra')) || 0,
        totalRepuestos: calcularTotalRepuestos(),
        trabajos: getOrdenFieldValue('ordenTrabajos'),
        repuestos: repuestosOrdenActual.map((repuesto) => ({ ...repuesto })),
        observaciones: getOrdenFieldValue('ordenObservaciones')
    };
}

function verDetalleOrden(index) {
    const orden = getOrdenesFiltradas()[index];

    if (!orden) {
        return;
    }

    modoOrdenTrabajo = 'vista';
    ordenSeleccionadaId = orden.id;
    cargarOrdenEnFormulario(orden);
    setOrdenSoloLectura(true);
    modalOrdenTrabajo.classList.add('is-open');
    modalOrdenTrabajo.setAttribute('aria-hidden', 'false');
    btnCerrarOrdenTrabajo.focus();
}

function editarOrden(index) {
    const orden = getOrdenesFiltradas()[index];

    if (!orden) {
        return;
    }

    modoOrdenTrabajo = 'edicion';
    ordenSeleccionadaId = orden.id;
    cargarOrdenEnFormulario(orden);
    setOrdenSoloLectura(false);
    modalOrdenTrabajo.classList.add('is-open');
    modalOrdenTrabajo.setAttribute('aria-hidden', 'false');
    document.getElementById('ordenNumero').focus();
}

function renderIndicadoresOrdenes() {
    totalOrdenesTrabajo.innerText = ordenesTrabajo.length;
    ordenesAbiertas.innerText = ordenesTrabajo.filter((orden) => orden.estado === 'Abierta').length;
    ordenesProceso.innerText = ordenesTrabajo.filter((orden) => orden.estado === 'En proceso').length;
    ordenesFinalizadas.innerText = ordenesTrabajo.filter((orden) => orden.estado === 'Finalizada').length;
    totalRepuestosOrdenes.innerText = formatCurrency(ordenesTrabajo.reduce((total, orden) => total + Number(orden.totalRepuestos || 0), 0));
}

function getOrdenesFiltradas() {
    const busqueda = buscarOrdenTrabajo.value.trim().toLowerCase();
    const estado = filtroEstadoOrdenTrabajo.value;

    return ordenesTrabajo.filter((orden) => {
        const coincideBusqueda = [
            orden.numero,
            orden.serie,
            orden.placa,
            orden.vehiculo,
            orden.piloto,
            orden.mecanico,
            orden.departamento
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(busqueda));
        const coincideEstado = estado === 'todos' || orden.estado === estado;

        return coincideBusqueda && coincideEstado;
    }).sort((ordenA, ordenB) => Number(ordenB.numero) - Number(ordenA.numero));
}

function renderOrdenesTrabajo() {
    const ordenesFiltradas = getOrdenesFiltradas();

    tablaOrdenesTrabajo.innerHTML = ordenesFiltradas.map((orden, index) => `
        <tr>
            <td>${orden.serie} - ${orden.numero}</td>
            <td>${orden.placa}</td>
            <td>${orden.vehiculo}</td>
            <td>${orden.piloto || 'Sin asignar'}</td>
            <td>${orden.mecanico || 'Sin asignar'}</td>
            <td>${formatFecha(orden.fechaEntrada)} ${formatHora(orden.horaEntrada, orden.periodoEntrada)}</td>
            <td><span class="status ${getEstadoClass(orden.estado)}">${orden.estado}</span></td>
            <td class="work-order-actions-cell">
                <div class="table-actions">
                    <button class="icon-action js-ver-orden" type="button" data-index="${index}" aria-label="Ver detalle de orden ${orden.numero}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="icon-action js-editar-orden" type="button" data-index="${index}" aria-label="Editar orden ${orden.numero}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                        </svg>
                    </button>
                    <button class="icon-action js-eliminar-orden" type="button" data-id="${orden.id}" aria-label="Eliminar orden ${orden.numero}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 6h18"></path>
                            <path d="M8 6V4h8v2"></path>
                            <path d="M19 6l-1 14H6L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (ordenesFiltradas.length === 0) {
        tablaOrdenesTrabajo.innerHTML = `
            <tr>
                <td colspan="8" class="empty-row">No hay ordenes de trabajo con esos filtros.</td>
            </tr>
        `;
    }

    renderIndicadoresOrdenes();
}

async function cargarDatosOrdenes() {
    try {
        const [vehiculos, repuestos, ordenes] = await Promise.all([
            window.api.vehiculos.list(),
            window.api.repuestos.list(),
            window.api.ordenes.list()
        ]);

        reemplazarContenido(catalogoVehiculos, vehiculos.map(mapVehiculoCatalogo));
        reemplazarContenido(inventarioRepuestos, repuestos);
        reemplazarContenido(ordenesTrabajo, ordenes);
        renderOrdenDatalists();
        renderRepuestosOrden();
        renderOrdenesTrabajo();
    } catch (error) {
        alert(`No se pudieron cargar las ordenes de trabajo: ${error.message}`);
    }
}

formOrdenTrabajo.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (modoOrdenTrabajo === 'vista') {
        return;
    }

    if (!validateTimeInput(ordenHoraEntrada)) {
        return;
    }

    validateTimeInput(ordenHoraSalida);

    try {
        const orden = getOrdenFormulario();

        if (modoOrdenTrabajo === 'edicion' && ordenSeleccionadaId) {
            await window.api.ordenes.update(ordenSeleccionadaId, orden);
        } else {
            await window.api.ordenes.create(orden);
        }

        limpiarOrdenTrabajo();
        await cargarDatosOrdenes();
        ocultarOrdenTrabajo();
    } catch (error) {
        alert(`No se pudo guardar la orden de trabajo: ${error.message}`);
    }
});

ordenPlaca.addEventListener('keydown', handlePlateKeydown);
buscarOrdenTrabajo.addEventListener('keydown', handlePlateKeydown);
ordenPlaca.addEventListener('input', () => {
    applyPlateFormat(ordenPlaca);
    autocompletarVehiculoPorPlaca();
});
ordenPlaca.addEventListener('change', autocompletarVehiculoPorPlaca);
buscarOrdenTrabajo.addEventListener('input', () => {
    applyPlateFormat(buscarOrdenTrabajo);
    renderOrdenesTrabajo();
});
[ordenHoraEntrada, ordenHoraSalida].forEach((input) => {
    input.addEventListener('keydown', handleTimeKeydown);
    input.addEventListener('paste', handleTimePaste);
    input.addEventListener('input', () => assistTimeInput(input));
    input.addEventListener('blur', () => assistTimeInput(input, true));
});
ordenRepuestoBusqueda.addEventListener('input', actualizarExistenciaRepuesto);
ordenRepuestoBusqueda.addEventListener('change', actualizarExistenciaRepuesto);
btnAgregarRepuestoOrden.addEventListener('click', agregarRepuestoOrden);
tablaRepuestosOrden.addEventListener('click', (event) => {
    const editButton = event.target.closest('.js-modificar-repuesto');
    const saveButton = event.target.closest('.js-guardar-cantidad');
    const cancelButton = event.target.closest('.js-cancelar-cantidad');
    const removeButton = event.target.closest('.js-quitar-repuesto');

    if (modoOrdenTrabajo === 'vista') {
        return;
    }

    if (editButton) {
        repuestoEditandoIndex = Number(editButton.dataset.index);
        renderRepuestosOrden();
        const quantityInput = tablaRepuestosOrden.querySelector('.js-cantidad-repuesto');

        if (quantityInput) {
            quantityInput.focus();
            quantityInput.select();
        }
        return;
    }

    if (cancelButton) {
        repuestoEditandoIndex = null;
        renderRepuestosOrden();
        return;
    }

    if (saveButton) {
        const index = Number(saveButton.dataset.index);
        const repuesto = repuestosOrdenActual[index];
        const quantityInput = tablaRepuestosOrden.querySelector(`.js-cantidad-repuesto[data-index="${index}"]`);
        const cantidad = parseCantidadRepuesto(quantityInput?.value);

        if (!repuesto || !cantidad) {
            alert('Ingresa una cantidad valida. Puedes usar enteros, decimales o fracciones como 1/2.');
            quantityInput?.focus();
            return;
        }

        if (cantidad.valor > Number(repuesto.existencia || 0)) {
            alert('La cantidad no puede ser mayor que la existencia disponible.');
            quantityInput.focus();
            return;
        }

        repuesto.cantidad = cantidad.valor;
        repuesto.cantidadTexto = cantidad.texto;
        repuestoEditandoIndex = null;
        renderRepuestosOrden();
        return;
    }

    if (removeButton) {
        repuestosOrdenActual.splice(Number(removeButton.dataset.index), 1);
        repuestoEditandoIndex = null;
        renderRepuestosOrden();
    }
});
tablaRepuestosOrden.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !event.target.classList.contains('js-cantidad-repuesto')) {
        return;
    }

    event.preventDefault();
    const saveButton = tablaRepuestosOrden.querySelector(`.js-guardar-cantidad[data-index="${event.target.dataset.index}"]`);

    if (saveButton) {
        saveButton.click();
    }
});
filtroEstadoOrdenTrabajo.addEventListener('change', renderOrdenesTrabajo);
btnNuevaOrdenTrabajo.addEventListener('click', abrirRegistroOrdenTrabajo);
btnCerrarOrdenTrabajo.addEventListener('click', ocultarOrdenTrabajo);
modalOrdenTrabajo.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-work-order-modal')) {
        event.preventDefault();
    }
});
tablaOrdenesTrabajo.addEventListener('click', (event) => {
    const detailButton = event.target.closest('.js-ver-orden');
    const editButton = event.target.closest('.js-editar-orden');
    const deleteButton = event.target.closest('.js-eliminar-orden');

    if (detailButton) {
        verDetalleOrden(Number(detailButton.dataset.index));
    }

    if (editButton) {
        editarOrden(Number(editButton.dataset.index));
    }

    if (deleteButton && confirm('Desea eliminar esta orden de trabajo?')) {
        window.api.ordenes.remove(Number(deleteButton.dataset.id))
            .then(cargarDatosOrdenes)
            .catch((error) => alert(`No se pudo eliminar la orden: ${error.message}`));
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalOrdenTrabajo.classList.contains('is-open')) {
        ocultarOrdenTrabajo();
    }
});

cargarDatosOrdenes();
