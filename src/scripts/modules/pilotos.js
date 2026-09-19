const tablaPilotos = document.getElementById('tablaPilotos');
const buscarPiloto = document.getElementById('buscarPiloto');
const filtroEstadoPiloto = document.getElementById('filtroEstadoPiloto');
const filtroTipoLicenciaPiloto = document.getElementById('filtroTipoLicenciaPiloto');
const formPiloto = document.getElementById('formPiloto');
const btnNuevoPiloto = document.getElementById('btnNuevoPiloto');
const modalPiloto = document.getElementById('modalPiloto');
const btnCerrarPiloto = document.getElementById('btnCerrarPiloto');
const btnGuardarPiloto = document.getElementById('btnGuardarPiloto');
const totalPilotos = document.getElementById('totalPilotos');
const pilotosActivos = document.getElementById('pilotosActivos');
const pilotosDisponibles = document.getElementById('pilotosDisponibles');
const pilotosInactivos = document.getElementById('pilotosInactivos');
const pilotoFormFields = Array.from(formPiloto.querySelectorAll('input, select'));
const pilotoVehiculo = document.getElementById('pilotoVehiculo');
const pilotoVehiculosList = document.getElementById('pilotoVehiculosList');

const pendienteAsignar = 'Pendiente de asignar';
let modoRegistroPiloto = 'nuevo';
let pilotoSeleccionadoId = null;
let pilotos = [];
let vehiculosRegistrados = [];

function getEstadoPilotoClass(estado) {
    if (estado === 'Activo') {
        return 'normal';
    }

    if (estado === 'Disponible') {
        return 'medium';
    }

    return 'high';
}

function formatFechaPiloto(value) {
    if (!value) {
        return 'Sin fecha';
    }

    const [year, month, day] = value.split('-');

    return `${day}/${month}/${year}`;
}

function getPilotoFieldValue(id) {
    return document.getElementById(id).value.trim();
}

function setPilotoFieldValue(id, value = '') {
    document.getElementById(id).value = value || '';
}

function enableEditableDatalist(input) {
    input.addEventListener('focus', () => {
        if (input.disabled || !input.value) {
            return;
        }

        input.dataset.previousValue = input.value;
        input.value = '';
    });

    input.addEventListener('input', () => {
        input.dataset.previousValue = '';
    });

    input.addEventListener('blur', () => {
        if (!input.value && input.dataset.previousValue) {
            input.value = input.dataset.previousValue;
        }

        input.dataset.previousValue = '';
    });
}

function escapeAttribute(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function renderVehiculosAsignables() {
    pilotoVehiculosList.innerHTML = [
        `<option value="${escapeAttribute(pendienteAsignar)}"></option>`,
        ...vehiculosRegistrados.map((vehiculo) => (
            `<option value="${escapeAttribute(vehiculo.placa)}"></option>`
        ))
    ].join('');
}

function getPlacaVehiculoAsignado(value) {
    const normalizedValue = value.trim();

    if (!normalizedValue || normalizedValue === pendienteAsignar) {
        return pendienteAsignar;
    }

    const vehiculoSeleccionado = vehiculosRegistrados.find((vehiculo) => (
        vehiculo.placa === normalizedValue.toUpperCase()
    ));

    if (vehiculoSeleccionado) {
        return vehiculoSeleccionado.placa;
    }

    const plateValue = normalizedValue.toUpperCase().replace(/\s+/g, '');

    if (/^[A-Z][^-]/.test(plateValue)) {
        return `${plateValue.charAt(0)}-${plateValue.slice(1)}`;
    }

    return plateValue;
}

function getVehiculoFormularioValue(vehiculo = '') {
    if (!vehiculo || vehiculo === 'Sin asignar') {
        return pendienteAsignar;
    }

    const vehiculoRegistrado = vehiculosRegistrados.find((item) => item.placa === vehiculo);
    return vehiculoRegistrado ? vehiculoRegistrado.placa : vehiculo;
}

function setRegistroPilotoSoloLectura(isReadOnly) {
    pilotoFormFields.forEach((field) => {
        field.disabled = isReadOnly;
    });

    btnGuardarPiloto.hidden = isReadOnly;
    modalPiloto.classList.toggle('is-readonly', isReadOnly);
}

function limpiarRegistroPiloto() {
    formPiloto.reset();
    pilotoSeleccionadoId = null;
}

function abrirRegistroPiloto() {
    const veniaDeVista = modoRegistroPiloto !== 'nuevo';

    modoRegistroPiloto = 'nuevo';
    pilotoSeleccionadoId = null;
    setRegistroPilotoSoloLectura(false);

    if (veniaDeVista) {
        limpiarRegistroPiloto();
    }

    modalPiloto.classList.add('is-open');
    modalPiloto.setAttribute('aria-hidden', 'false');
    document.getElementById('pilotoNombre').focus();
}

function ocultarRegistroPiloto() {
    modalPiloto.classList.remove('is-open');
    modalPiloto.setAttribute('aria-hidden', 'true');
    btnNuevoPiloto.focus();
}

function getPilotoFormulario() {
    return {
        nombre: getPilotoFieldValue('pilotoNombre'),
        dpi: getPilotoFieldValue('pilotoDpi'),
        nit: getPilotoFieldValue('pilotoNit'),
        telefono: getPilotoFieldValue('pilotoTelefono'),
        correo: getPilotoFieldValue('pilotoCorreo'),
        licencia: getPilotoFieldValue('pilotoLicencia').toUpperCase(),
        tipoLicencia: document.getElementById('pilotoTipoLicencia').value,
        venceLicencia: document.getElementById('pilotoVenceLicencia').value,
        estado: document.getElementById('pilotoEstado').value,
        vehiculo: getPlacaVehiculoAsignado(getPilotoFieldValue('pilotoVehiculo')),
        direccion: getPilotoFieldValue('pilotoDireccion'),
        emergencia: getPilotoFieldValue('pilotoEmergencia')
    };
}

function cargarPilotoEnFormulario(piloto) {
    setPilotoFieldValue('pilotoNombre', piloto.nombre);
    setPilotoFieldValue('pilotoDpi', piloto.dpi);
    setPilotoFieldValue('pilotoNit', piloto.nit);
    setPilotoFieldValue('pilotoTelefono', piloto.telefono);
    setPilotoFieldValue('pilotoCorreo', piloto.correo);
    setPilotoFieldValue('pilotoLicencia', piloto.licencia);
    setPilotoFieldValue('pilotoTipoLicencia', piloto.tipoLicencia || 'A');
    setPilotoFieldValue('pilotoVenceLicencia', piloto.venceLicencia);
    setPilotoFieldValue('pilotoEstado', piloto.estado || 'Activo');
    setPilotoFieldValue('pilotoVehiculo', getVehiculoFormularioValue(piloto.vehiculo));
    setPilotoFieldValue('pilotoDireccion', piloto.direccion);
    setPilotoFieldValue('pilotoEmergencia', piloto.emergencia);
}

function verDetallePiloto(index) {
    const piloto = getPilotosFiltrados()[index];

    if (!piloto) {
        return;
    }

    modoRegistroPiloto = 'vista';
    pilotoSeleccionadoId = piloto.id;
    cargarPilotoEnFormulario(piloto);
    setRegistroPilotoSoloLectura(true);
    modalPiloto.classList.add('is-open');
    modalPiloto.setAttribute('aria-hidden', 'false');
    btnCerrarPiloto.focus();
}

function editarPiloto(index) {
    const piloto = getPilotosFiltrados()[index];

    if (!piloto) {
        return;
    }

    modoRegistroPiloto = 'edicion';
    pilotoSeleccionadoId = piloto.id;
    cargarPilotoEnFormulario(piloto);
    setRegistroPilotoSoloLectura(false);
    modalPiloto.classList.add('is-open');
    modalPiloto.setAttribute('aria-hidden', 'false');
    document.getElementById('pilotoNombre').focus();
}

function getPilotosPorTipoLicencia() {
    const tipoLicencia = filtroTipoLicenciaPiloto.value;

    if (tipoLicencia === 'todos') {
        return pilotos;
    }

    return pilotos.filter((piloto) => piloto.tipoLicencia === tipoLicencia);
}

function renderIndicadoresPilotos() {
    const pilotosIndicador = getPilotosPorTipoLicencia();

    totalPilotos.innerText = pilotosIndicador.length;
    pilotosActivos.innerText = pilotosIndicador.filter((piloto) => piloto.estado === 'Activo').length;
    pilotosDisponibles.innerText = pilotosIndicador.filter((piloto) => piloto.estado === 'Disponible').length;
    pilotosInactivos.innerText = pilotosIndicador.filter((piloto) => piloto.estado === 'Inactivo').length;
}

function getPilotosFiltrados() {
    const busqueda = buscarPiloto.value.trim().toLowerCase();
    const estado = filtroEstadoPiloto.value;

    return pilotos.filter((piloto) => {
        const coincideBusqueda = [
            piloto.nombre,
            piloto.dpi,
            piloto.nit,
            piloto.telefono,
            piloto.correo,
            piloto.licencia,
            piloto.tipoLicencia,
            piloto.vehiculo
        ].filter(Boolean).some((valor) => String(valor).toLowerCase().includes(busqueda));
        const coincideEstado = estado === 'todos' || piloto.estado === estado;

        return coincideBusqueda && coincideEstado;
    });
}

function renderPilotos() {
    const pilotosFiltrados = getPilotosFiltrados();

    tablaPilotos.innerHTML = pilotosFiltrados.map((piloto, index) => `
        <tr>
            <td>${piloto.nombre}</td>
            <td>${piloto.licencia} / ${piloto.tipoLicencia}</td>
            <td>${piloto.telefono}</td>
            <td>${piloto.vehiculo || pendienteAsignar}</td>
            <td><span class="status ${getEstadoPilotoClass(piloto.estado)}">${piloto.estado}</span></td>
            <td>${formatFechaPiloto(piloto.venceLicencia)}</td>
            <td class="vehicle-actions-cell">
                <div class="table-actions">
                    <button class="icon-action js-ver-piloto" type="button" data-index="${index}" aria-label="Ver detalle de ${piloto.nombre}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="icon-action js-editar-piloto" type="button" data-index="${index}" aria-label="Editar ${piloto.nombre}">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                        </svg>
                    </button>
                    <button class="icon-action js-eliminar-piloto" type="button" data-id="${piloto.id}" aria-label="Eliminar ${piloto.nombre}">
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

    if (pilotosFiltrados.length === 0) {
        tablaPilotos.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">No hay clientes con esos filtros.</td>
            </tr>
        `;
    }

    renderIndicadoresPilotos();
}

async function cargarPilotos() {
    try {
        const [pilotosData, vehiculosData] = await Promise.all([
            window.api.pilotos.list(),
            window.api.vehiculos.list()
        ]);

        pilotos = pilotosData;
        vehiculosRegistrados = vehiculosData;
        renderVehiculosAsignables();
        renderPilotos();
    } catch (error) {
        alert(`No se pudieron cargar los clientes: ${error.message}`);
    }
}

formPiloto.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (modoRegistroPiloto === 'vista') {
        return;
    }

    try {
        const piloto = getPilotoFormulario();

        if (modoRegistroPiloto === 'edicion' && pilotoSeleccionadoId) {
            await window.api.pilotos.update(pilotoSeleccionadoId, piloto);
        } else {
            await window.api.pilotos.create(piloto);
        }

        limpiarRegistroPiloto();
        await cargarPilotos();
        ocultarRegistroPiloto();
    } catch (error) {
        alert(`No se pudo guardar el cliente: ${error.message}`);
    }
});

buscarPiloto.addEventListener('input', renderPilotos);
enableEditableDatalist(pilotoVehiculo);
filtroEstadoPiloto.addEventListener('change', renderPilotos);
filtroTipoLicenciaPiloto.addEventListener('change', renderIndicadoresPilotos);
btnNuevoPiloto.addEventListener('click', abrirRegistroPiloto);
btnCerrarPiloto.addEventListener('click', ocultarRegistroPiloto);
modalPiloto.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-pilot-modal')) {
        event.preventDefault();
    }
});
tablaPilotos.addEventListener('click', (event) => {
    const detailButton = event.target.closest('.js-ver-piloto');
    const editButton = event.target.closest('.js-editar-piloto');
    const deleteButton = event.target.closest('.js-eliminar-piloto');

    if (detailButton) {
        verDetallePiloto(Number(detailButton.dataset.index));
    }

    if (editButton) {
        editarPiloto(Number(editButton.dataset.index));
    }

    if (deleteButton && confirm('Desea eliminar este cliente?')) {
        window.api.pilotos.remove(Number(deleteButton.dataset.id))
            .then(cargarPilotos)
            .catch((error) => alert(`No se pudo eliminar el cliente: ${error.message}`));
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalPiloto.classList.contains('is-open')) {
        ocultarRegistroPiloto();
    }
});

cargarPilotos();
