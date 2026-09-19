const tablaVehiculos = document.getElementById('tablaVehiculos');
const buscarVehiculo = document.getElementById('buscarVehiculo');
const filtroEstadoVehiculo = document.getElementById('filtroEstadoVehiculo');
const filtroTipoIndicador = document.getElementById('filtroTipoIndicador');
const formVehiculo = document.getElementById('formVehiculo');
const btnNuevoVehiculo = document.getElementById('btnNuevoVehiculo');
const modalVehiculo = document.getElementById('modalVehiculo');
const btnCerrarVehiculo = document.getElementById('btnCerrarVehiculo');
const btnGuardarVehiculo = document.getElementById('btnGuardarVehiculo');
const totalVehiculos = document.getElementById('totalVehiculos');
const vehiculosActivos = document.getElementById('vehiculosActivos');
const vehiculosTaller = document.getElementById('vehiculosTaller');
const vehiculosInactivos = document.getElementById('vehiculosInactivos');
const formFields = Array.from(formVehiculo.querySelectorAll('input, select'));
const vehiculoPlaca = document.getElementById('vehiculoPlaca');

let modoRegistroVehiculo = 'nuevo';
let vehiculoSeleccionadoId = null;
let vehiculos = [];

function getEstadoClass(estado) {
    if (estado === 'Activo') {
        return 'normal';
    }

    if (estado === 'En taller') {
        return 'medium';
    }

    return 'high';
}

function formatKilometraje(value) {
    return `${Number(value || 0).toLocaleString('en-US')} km`;
}

function getFieldValue(id) {
    return document.getElementById(id).value.trim();
}

function setFieldValue(id, value = '') {
    document.getElementById(id).value = value || '';
}

function formatVehiclePlateInput(value) {
    const normalized = value.toUpperCase().replace(/\s+/g, '');

    if (/^[A-Z]$/.test(normalized)) {
        return `${normalized}-`;
    }

    if (/^[A-Z][^-]/.test(normalized)) {
        return `${normalized.charAt(0)}-${normalized.slice(1)}`;
    }

    return normalized;
}

function applyVehiclePlateFormat(input) {
    if (input.dataset.skipPlateFormat === 'true') {
        input.dataset.skipPlateFormat = 'false';
        input.value = input.value.toUpperCase().replace(/\s+/g, '');
        return;
    }

    const formattedValue = formatVehiclePlateInput(input.value);

    if (input.value !== formattedValue) {
        input.value = formattedValue;
    }
}

function setRegistroSoloLectura(isReadOnly) {
    formFields.forEach((field) => {
        field.disabled = isReadOnly;
    });

    btnGuardarVehiculo.hidden = isReadOnly;
    modalVehiculo.classList.toggle('is-readonly', isReadOnly);
}

function limpiarRegistroVehiculo() {
    formVehiculo.reset();
    vehiculoSeleccionadoId = null;
}

function abrirRegistroVehiculo() {
    const veniaDeVista = modoRegistroVehiculo !== 'nuevo';

    modoRegistroVehiculo = 'nuevo';
    vehiculoSeleccionadoId = null;
    setRegistroSoloLectura(false);

    if (veniaDeVista) {
        limpiarRegistroVehiculo();
    }

    modalVehiculo.classList.add('is-open');
    modalVehiculo.setAttribute('aria-hidden', 'false');
    vehiculoPlaca.focus();
}

function ocultarRegistroVehiculo() {
    modalVehiculo.classList.remove('is-open');
    modalVehiculo.setAttribute('aria-hidden', 'true');
    btnNuevoVehiculo.focus();
}

function getVehiculoFormulario() {
    const vehiculoActual = vehiculos.find((vehiculo) => vehiculo.id === vehiculoSeleccionadoId);

    return {
        placa: formatVehiclePlateInput(getFieldValue('vehiculoPlaca')),
        noTarjeta: getFieldValue('vehiculoTarjeta'),
        nit: getFieldValue('vehiculoNit'),
        cui: getFieldValue('vehiculoCui'),
        propietario: getFieldValue('vehiculoPropietario'),
        piloto: getFieldValue('vehiculoPiloto') || 'Sin asignar',
        uso: document.getElementById('vehiculoUso').value,
        tipo: document.getElementById('vehiculoTipo').value,
        marca: getFieldValue('vehiculoMarca'),
        linea: getFieldValue('vehiculoLinea'),
        modelo: [getFieldValue('vehiculoMarca'), getFieldValue('vehiculoLinea')]
            .filter(Boolean)
            .join(' ') || getFieldValue('vehiculoModelo'),
        modeloRegistro: getFieldValue('vehiculoModelo'),
        color: getFieldValue('vehiculoColor'),
        chasis: getFieldValue('vehiculoChasis'),
        serie: getFieldValue('vehiculoSerie'),
        vin: getFieldValue('vehiculoVin'),
        motor: getFieldValue('vehiculoMotor'),
        asientos: Number(getFieldValue('vehiculoAsientos')) || 0,
        ejes: Number(getFieldValue('vehiculoEjes')) || 0,
        cilindros: Number(getFieldValue('vehiculoCilindros')) || 0,
        cc: Number(getFieldValue('vehiculoCc')) || 0,
        tonelaje: Number(getFieldValue('vehiculoTonelaje')) || 0,
        estado: modoRegistroVehiculo === 'edicion' ? vehiculoActual?.estado || 'Activo' : 'Activo',
        kilometraje: Number(getFieldValue('vehiculoKilometraje')) || 0
    };
}

function cargarVehiculoEnFormulario(vehiculo) {
    setFieldValue('vehiculoPlaca', vehiculo.placa);
    setFieldValue('vehiculoTarjeta', vehiculo.noTarjeta);
    setFieldValue('vehiculoNit', vehiculo.nit);
    setFieldValue('vehiculoCui', vehiculo.cui);
    setFieldValue('vehiculoPropietario', vehiculo.propietario);
    setFieldValue('vehiculoPiloto', vehiculo.piloto);
    setFieldValue('vehiculoUso', vehiculo.uso || 'Particular');
    setFieldValue('vehiculoTipo', vehiculo.tipo || 'Camion');
    setFieldValue('vehiculoMarca', vehiculo.marca);
    setFieldValue('vehiculoLinea', vehiculo.linea);
    setFieldValue('vehiculoModelo', vehiculo.modeloRegistro || vehiculo.modelo);
    setFieldValue('vehiculoColor', vehiculo.color);
    setFieldValue('vehiculoChasis', vehiculo.chasis);
    setFieldValue('vehiculoSerie', vehiculo.serie);
    setFieldValue('vehiculoVin', vehiculo.vin);
    setFieldValue('vehiculoMotor', vehiculo.motor);
    setFieldValue('vehiculoAsientos', vehiculo.asientos || '');
    setFieldValue('vehiculoEjes', vehiculo.ejes || '');
    setFieldValue('vehiculoCilindros', vehiculo.cilindros || '');
    setFieldValue('vehiculoCc', vehiculo.cc || '');
    setFieldValue('vehiculoTonelaje', vehiculo.tonelaje || '');
    setFieldValue('vehiculoKilometraje', vehiculo.kilometraje || '');
}

function verDetalleVehiculo(index) {
    const vehiculo = getVehiculosFiltrados()[index];

    if (!vehiculo) {
        return;
    }

    modoRegistroVehiculo = 'vista';
    vehiculoSeleccionadoId = vehiculo.id;
    cargarVehiculoEnFormulario(vehiculo);
    setRegistroSoloLectura(true);
    modalVehiculo.classList.add('is-open');
    modalVehiculo.setAttribute('aria-hidden', 'false');
    btnCerrarVehiculo.focus();
}

function editarVehiculo(index) {
    const vehiculo = getVehiculosFiltrados()[index];

    if (!vehiculo) {
        return;
    }

    modoRegistroVehiculo = 'edicion';
    vehiculoSeleccionadoId = vehiculo.id;
    cargarVehiculoEnFormulario(vehiculo);
    setRegistroSoloLectura(false);
    modalVehiculo.classList.add('is-open');
    modalVehiculo.setAttribute('aria-hidden', 'false');
    vehiculoPlaca.focus();
}

function getVehiculosPorTipoIndicador() {
    const tipo = filtroTipoIndicador.value;

    if (tipo === 'todos') {
        return vehiculos;
    }

    return vehiculos.filter((vehiculo) => vehiculo.tipo === tipo);
}

function renderIndicadoresVehiculos() {
    const vehiculosIndicador = getVehiculosPorTipoIndicador();

    totalVehiculos.innerText = vehiculosIndicador.length;
    vehiculosActivos.innerText = vehiculosIndicador.filter((vehiculo) => vehiculo.estado === 'Activo').length;
    vehiculosTaller.innerText = vehiculosIndicador.filter((vehiculo) => vehiculo.estado === 'En taller').length;
    vehiculosInactivos.innerText = vehiculosIndicador.filter((vehiculo) => vehiculo.estado === 'Inactivo').length;
}

function getVehiculosFiltrados() {
    const busqueda = buscarVehiculo.value.trim().toLowerCase();
    const estado = filtroEstadoVehiculo.value;

    return vehiculos.filter((vehiculo) => {
        const coincideBusqueda = [
            vehiculo.placa,
            vehiculo.tipo,
            vehiculo.modelo,
            vehiculo.marca,
            vehiculo.linea,
            vehiculo.piloto,
            vehiculo.propietario,
            vehiculo.noTarjeta
        ].filter(Boolean).some((valor) => String(valor).toLowerCase().includes(busqueda));
        const coincideEstado = estado === 'todos' || vehiculo.estado === estado;

        return coincideBusqueda && coincideEstado;
    }).sort(compareVehiculosPorPlaca);
}

function getPlateSortParts(placa = '') {
    const normalized = String(placa).toUpperCase();
    const [, letra = '', numero = '0', resto = ''] = normalized.match(/^([A-Z])-?(\d+)(.*)$/) || [];

    return {
        letra,
        numero: Number(numero) || 0,
        resto
    };
}

function compareVehiculosPorPlaca(vehiculoA, vehiculoB) {
    const placaA = getPlateSortParts(vehiculoA.placa);
    const placaB = getPlateSortParts(vehiculoB.placa);
    const letraCompare = placaA.letra.localeCompare(placaB.letra);

    if (letraCompare !== 0) {
        return letraCompare;
    }

    if (placaA.numero !== placaB.numero) {
        return placaA.numero - placaB.numero;
    }

    return placaA.resto.localeCompare(placaB.resto);
}

function renderVehiculos() {
    const vehiculosFiltrados = getVehiculosFiltrados();

    tablaVehiculos.innerHTML = vehiculosFiltrados.map((vehiculo, index) => `
        <tr>
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.tipo}</td>
            <td>${vehiculo.modelo}</td>
            <td>${vehiculo.piloto || 'Sin asignar'}</td>
            <td><span class="status ${getEstadoClass(vehiculo.estado)}">${vehiculo.estado}</span></td>
            <td>${formatKilometraje(vehiculo.kilometraje)}</td>
            <td class="vehicle-actions-cell">
                <div class="table-actions vehicle-actions">
                    <button class="icon-action js-ver-vehiculo" type="button" data-index="${index}" aria-label="Ver detalle de ${vehiculo.placa}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="icon-action js-editar-vehiculo" type="button" data-index="${index}" aria-label="Editar ${vehiculo.placa}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                        </svg>
                    </button>
                    <button class="icon-action js-eliminar-vehiculo" type="button" data-id="${vehiculo.id}" aria-label="Eliminar ${vehiculo.placa}">
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

    if (vehiculosFiltrados.length === 0) {
        tablaVehiculos.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">No hay vehiculos con esos filtros.</td>
            </tr>
        `;
    }

    renderIndicadoresVehiculos();
}

async function cargarVehiculos() {
    try {
        vehiculos = await window.api.vehiculos.list();
        renderVehiculos();
    } catch (error) {
        alert(`No se pudieron cargar los vehiculos: ${error.message}`);
    }
}

formVehiculo.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (modoRegistroVehiculo === 'vista') {
        return;
    }

    try {
        const vehiculo = getVehiculoFormulario();

        if (modoRegistroVehiculo === 'edicion' && vehiculoSeleccionadoId) {
            await window.api.vehiculos.update(vehiculoSeleccionadoId, vehiculo);
        } else {
            await window.api.vehiculos.create(vehiculo);
        }

        limpiarRegistroVehiculo();
        await cargarVehiculos();
        ocultarRegistroVehiculo();
    } catch (error) {
        alert(`No se pudo guardar el vehiculo: ${error.message}`);
    }
});

function handleVehiclePlateKeydown(event) {
    if (event.key === 'Backspace' || event.key === 'Delete') {
        if (!event.target.value) {
            event.target.dataset.skipPlateFormat = 'false';
            return;
        }

        if (/^[A-Z]-$/.test(event.target.value.toUpperCase())) {
            event.preventDefault();
            event.target.value = '';
            event.target.dataset.skipPlateFormat = 'false';

            if (event.target === buscarVehiculo) {
                renderVehiculos();
            }

            return;
        }

        event.target.dataset.skipPlateFormat = 'true';
        return;
    }

    event.target.dataset.skipPlateFormat = 'false';
}

vehiculoPlaca.addEventListener('keydown', handleVehiclePlateKeydown);
buscarVehiculo.addEventListener('keydown', handleVehiclePlateKeydown);
vehiculoPlaca.addEventListener('input', () => {
    applyVehiclePlateFormat(vehiculoPlaca);
});
buscarVehiculo.addEventListener('input', () => {
    applyVehiclePlateFormat(buscarVehiculo);
    renderVehiculos();
});
filtroEstadoVehiculo.addEventListener('change', renderVehiculos);
filtroTipoIndicador.addEventListener('change', renderIndicadoresVehiculos);
btnNuevoVehiculo.addEventListener('click', abrirRegistroVehiculo);
btnCerrarVehiculo.addEventListener('click', ocultarRegistroVehiculo);
modalVehiculo.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-vehicle-modal')) {
        event.preventDefault();
    }
});
tablaVehiculos.addEventListener('click', (event) => {
    const detailButton = event.target.closest('.js-ver-vehiculo');
    const editButton = event.target.closest('.js-editar-vehiculo');
    const deleteButton = event.target.closest('.js-eliminar-vehiculo');

    if (detailButton) {
        verDetalleVehiculo(Number(detailButton.dataset.index));
    }

    if (editButton) {
        editarVehiculo(Number(editButton.dataset.index));
    }

    if (deleteButton && confirm('Desea eliminar este vehiculo?')) {
        window.api.vehiculos.remove(Number(deleteButton.dataset.id))
            .then(cargarVehiculos)
            .catch((error) => alert(`No se pudo eliminar el vehiculo: ${error.message}`));
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalVehiculo.classList.contains('is-open')) {
        ocultarRegistroVehiculo();
    }
});

cargarVehiculos();
