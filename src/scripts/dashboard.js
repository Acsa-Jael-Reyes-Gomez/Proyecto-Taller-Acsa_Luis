function hasAuthenticatedUser() {
    try {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        return Boolean(user?.id && user?.usuario);
    } catch {
        return false;
    }
}

if (!hasAuthenticatedUser()) {
    window.location.replace('login.html');
}

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const tireSummaryList = document.getElementById('tireSummaryList');
const tirePrev = document.getElementById('tirePrev');
const tireNext = document.getElementById('tireNext');
const tirePageLabel = document.getElementById('tirePageLabel');
const tablaServiciosInicio = document.getElementById('tablaServiciosInicio');
const sidebarStateKey = 'sidebarCollapsed';

if (sidebar && sidebarToggle) {
    const savedSidebarState = localStorage.getItem(sidebarStateKey);
    const startsCollapsed = savedSidebarState === 'true';

    sidebar.classList.toggle('collapsed', startsCollapsed);
    sidebarToggle.setAttribute(
        'aria-label',
        startsCollapsed ? 'Expandir menu' : 'Contraer menu'
    );
    sidebarToggle.setAttribute('aria-expanded', String(!startsCollapsed));

    sidebarToggle.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');

        localStorage.setItem(sidebarStateKey, String(isCollapsed));
        sidebarToggle.setAttribute(
            'aria-label',
            isCollapsed ? 'Expandir menu' : 'Contraer menu'
        );
        sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
}

const tires = [
    {
        plate: 'C-842BVK',
        position: 'Delantera izquierda',
        life: 18,
        status: 'critical'
    },
    {
        plate: 'C-377KLM',
        position: 'Trasera derecha',
        life: 32,
        status: 'warning'
    },
    {
        plate: 'P-190FRT',
        position: 'Juego trasero',
        life: 64,
        status: 'good'
    },
    {
        plate: 'C-555NQP',
        position: 'Delantera derecha',
        life: 24,
        status: 'critical'
    },
    {
        plate: 'P-728DHS',
        position: 'Trasera izquierda',
        life: 41,
        status: 'warning'
    },
    {
        plate: 'C-901LPA',
        position: 'Juego delantero',
        life: 72,
        status: 'good'
    }
];

const tiresPerPage = 4;
let tirePage = 0;

const serviciosProximos = [
    {
        placa: 'C-842BVK',
        vehiculo: 'Freightliner M2',
        servicio: 'Cambio de aceite',
        fechaUltimoServicio: '28/05/2026',
        kilometrosRestantes: 450,
        estado: 'Urgente',
        prioridad: 'high'
    },
    {
        placa: 'P-190FRT',
        vehiculo: 'Hino 500',
        servicio: 'Frenos delanteros',
        fechaUltimoServicio: '30/05/2026',
        kilometrosRestantes: 820,
        estado: 'Proximo',
        prioridad: 'medium'
    },
    {
        placa: 'C-377KLM',
        vehiculo: 'International 4300',
        servicio: 'Alineacion',
        fechaUltimoServicio: '03/06/2026',
        kilometrosRestantes: 1250,
        estado: 'Programado',
        prioridad: 'normal'
    },
    {
        placa: 'C-555NQP',
        vehiculo: 'Kenworth T370',
        servicio: 'Filtro de combustible',
        fechaUltimoServicio: '06/06/2026',
        kilometrosRestantes: 2100,
        estado: 'Programado',
        prioridad: 'normal'
    },
    {
        placa: 'P-728DHS',
        vehiculo: 'Isuzu NPR',
        servicio: 'Revision general',
        fechaUltimoServicio: '09/06/2026',
        kilometrosRestantes: 1650,
        estado: 'Proximo',
        prioridad: 'medium'
    },
    {
        placa: 'C-901LPA',
        vehiculo: 'Volvo VM',
        servicio: 'Cambio de llantas',
        fechaUltimoServicio: '11/06/2026',
        kilometrosRestantes: 280,
        estado: 'Urgente',
        prioridad: 'high'
    },
    {
        placa: 'P-440MDR',
        vehiculo: 'Mitsubishi Fuso',
        servicio: 'Servicio de suspension',
        fechaUltimoServicio: '13/06/2026',
        kilometrosRestantes: 3400,
        estado: 'Programado',
        prioridad: 'normal'
    },
    {
        placa: 'C-118QWE',
        vehiculo: 'Scania P250',
        servicio: 'Revision de bateria',
        fechaUltimoServicio: '15/06/2026',
        kilometrosRestantes: 1100,
        estado: 'Proximo',
        prioridad: 'medium'
    },
    {
        placa: 'C-763RST',
        vehiculo: 'Mercedes Atego',
        servicio: 'Cambio de aceite',
        fechaUltimoServicio: '18/06/2026',
        kilometrosRestantes: 2850,
        estado: 'Programado',
        prioridad: 'normal'
    },
    {
        placa: 'P-315ZXC',
        vehiculo: 'Hino Dutro',
        servicio: 'Freno trasero',
        fechaUltimoServicio: '20/06/2026',
        kilometrosRestantes: 390,
        estado: 'Urgente',
        prioridad: 'high'
    },
    {
        placa: 'C-640BNM',
        vehiculo: 'Kenworth T680',
        servicio: 'Alineacion y balanceo',
        fechaUltimoServicio: '24/06/2026',
        kilometrosRestantes: 970,
        estado: 'Proximo',
        prioridad: 'medium'
    }
];

function renderTires() {
    const totalPages = Math.ceil(tires.length / tiresPerPage);
    const start = tirePage * tiresPerPage;
    const currentTires = tires.slice(start, start + tiresPerPage);

    tireSummaryList.innerHTML = currentTires.map((tire) => `
        <article class="tire-summary-item ${tire.status}">
            <strong>${tire.plate}</strong>
            <span>${tire.life}%</span>
            <small>${tire.position}</small>
        </article>
    `).join('');

    tirePageLabel.innerText = `${tirePage + 1} / ${totalPages}`;
    tirePrev.disabled = tirePage === 0;
    tireNext.disabled = tirePage === totalPages - 1;
}

if (tireSummaryList && tirePrev && tireNext && tirePageLabel) {
    tirePrev.addEventListener('click', () => {
        if (tirePage > 0) {
            tirePage -= 1;
            renderTires();
        }
    });

    tireNext.addEventListener('click', () => {
        const totalPages = Math.ceil(tires.length / tiresPerPage);

        if (tirePage < totalPages - 1) {
            tirePage += 1;
            renderTires();
        }
    });

    renderTires();
}

function formatKilometros(value) {
    return `${Number(value || 0).toLocaleString('en-US')} km`;
}

function renderServiciosInicio() {
    tablaServiciosInicio.innerHTML = serviciosProximos.map((servicio) => `
        <tr>
            <td>${servicio.placa}</td>
            <td>${servicio.vehiculo}</td>
            <td>${servicio.servicio}</td>
            <td>${servicio.fechaUltimoServicio}</td>
            <td>${formatKilometros(servicio.kilometrosRestantes)}</td>
            <td><span class="status ${servicio.prioridad}">${servicio.estado}</span></td>
        </tr>
    `).join('');
}

if (tablaServiciosInicio) {
    renderServiciosInicio();
}
