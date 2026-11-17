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
const tablaServiciosInicio = document.getElementById('tablaServiciosInicio');
const sidebarStateKey = 'sidebarCollapsed';
let dashboardLoading = false;
let dashboardRefreshQueued = false;

function leerUsuarioActual() {
    try { return JSON.parse(sessionStorage.getItem('currentUser') || 'null'); }
    catch { return null; }
}

const usuarioActual = leerUsuarioActual();
if (window.location.pathname.endsWith('/usuarios.html') && usuarioActual?.rol !== 'Administrador') {
    window.location.replace('dashboard.html');
}
window.api?.auth?.onLoggedOut?.(() => {
    sessionStorage.removeItem('currentUser');
    window.location.replace('login.html');
});
window.api?.auth?.onRoleChanged?.(role => {
    if (usuarioActual) sessionStorage.setItem('currentUser', JSON.stringify({ ...usuarioActual, rol: role }));
    window.location.reload();
});

if (sidebar && usuarioActual) {
    const nav = sidebar.querySelector('.sidebar-nav');
    if (usuarioActual.rol === 'Administrador' && nav) {
        let link = nav.querySelector('a[href="usuarios.html"]');
        if (!link) {
            link = document.createElement('a'); link.href = 'usuarios.html'; link.className = 'nav-button';
            link.dataset.tooltip = 'Usuarios'; link.innerHTML = '<span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m7-3h6m-3-3v6"/></svg></span><span class="nav-label">Usuarios</span>';
            nav.append(link);
        }
        if (window.location.pathname.endsWith('/usuarios.html')) link.classList.add('active');
    }
    const account = document.createElement('section'); account.className = 'sidebar-account';
    const identity = document.createElement('div'); identity.className = 'sidebar-account-identity';
    const name = document.createElement('strong'); name.textContent = [usuarioActual.nombre, usuarioActual.apellido].filter(Boolean).join(' ') || usuarioActual.usuario;
    const role = document.createElement('span'); role.textContent = usuarioActual.rol || 'Empleado';
    const mark = document.createElement('span'); mark.className = 'sidebar-account-mark';
    mark.textContent = name.textContent.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toLocaleUpperCase()).join('');
    mark.title = `${name.textContent} · ${role.textContent}`; mark.setAttribute('aria-label', mark.title);
    const logout = document.createElement('button'); logout.type = 'button'; logout.className = 'sidebar-logout'; logout.textContent = 'Cerrar sesión';
    identity.append(name, role); account.append(mark, identity, logout); sidebar.append(account);
    logout.addEventListener('click', async () => {
        if (!await window.ui.confirm('¿Deseas cerrar la sesión en esta cuenta?', { title: 'Cerrar sesión', confirmText: 'Cerrar sesión' })) return;
        logout.disabled = true;
        try { await window.api.auth.logout(); }
        catch (error) { logout.disabled = false; await window.ui.alert(`No se pudo cerrar la sesión: ${error.message}`); }
    });
}

if (sidebar && sidebarToggle) {
    const savedSidebarState = localStorage.getItem(sidebarStateKey);
    const startsCollapsed = savedSidebarState === 'true';
    const setSidebarTitles = collapsed => sidebar.querySelectorAll('.nav-button').forEach(link => {
        if (collapsed && link.dataset.tooltip) link.title = link.dataset.tooltip;
        else link.removeAttribute('title');
    });

    sidebar.classList.toggle('collapsed', startsCollapsed);
    document.documentElement.toggleAttribute('data-sidebar-collapsed', startsCollapsed);
    setSidebarTitles(startsCollapsed);
    sidebarToggle.setAttribute(
        'aria-label',
        startsCollapsed ? 'Expandir menu' : 'Contraer menu'
    );
    sidebarToggle.setAttribute('aria-expanded', String(!startsCollapsed));

    sidebarToggle.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');

        localStorage.setItem(sidebarStateKey, String(isCollapsed));
        document.documentElement.toggleAttribute('data-sidebar-collapsed', isCollapsed);
        setSidebarTitles(isCollapsed);
        sidebarToggle.setAttribute(
            'aria-label',
            isCollapsed ? 'Expandir menu' : 'Contraer menu'
        );
        sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
}


async function cargarDashboard() {
    if (!tablaServiciosInicio) return;
    if (dashboardLoading) {
        dashboardRefreshQueued = true;
        return;
    }
    dashboardLoading = true;
    try {
        const data = await window.api.dashboard.get();
        // Una ventana recargada puede convivir con un proceso principal anterior.
        // Si falta el contador nuevo, obtenerlo de las ordenes persistidas.
        if (data.enTaller == null) {
            const ordenes = await window.api.ordenes.list();
            data.enTaller = ordenes.filter(orden => ['Espera', 'Activa', 'Abierta', 'En proceso', 'Finalizada'].includes(orden.estado)).length;
        }
        for (const key of ['vehiculos', 'proximos', 'vencidos', 'enTaller']) {
            document.getElementById('indicador-' + key).textContent = data[key] ?? '--';
        }
        const serviciosOrdenados = [...data.servicios].sort((a, b) => {
            const kilometrosA = Number(a.kilometros_restantes);
            const kilometrosB = Number(b.kilometros_restantes);
            const tieneKmA = a.kilometros_restantes != null && Number.isFinite(kilometrosA);
            const tieneKmB = b.kilometros_restantes != null && Number.isFinite(kilometrosB);
            if (!tieneKmA && !tieneKmB) return 0;
            if (!tieneKmA) return 1;
            if (!tieneKmB) return -1;
            return kilometrosA - kilometrosB;
        });
        tablaServiciosInicio.replaceChildren(...serviciosOrdenados.map(servicio => {
            const tr = document.createElement('tr');
            if (servicio.estado_alerta === 'Servicio pasado') tr.classList.add('maintenance-overdue');
            const valores = [servicio.placa, servicio.vehiculo, servicio.servicio, servicio.fecha_proximo_servicio,
                servicio.dias_restantes == null ? 'Sin fecha' : servicio.dias_restantes < 0 ? `Vencido hace ${Math.abs(servicio.dias_restantes)} dias` : servicio.dias_restantes === 0 ? 'Hoy' : `${servicio.dias_restantes} dias`,
                servicio.kilometraje_proximo == null ? 'Sin referencia' : `${Number(servicio.kilometraje_proximo).toLocaleString()} km`,
                servicio.kilometros_restantes == null ? 'Sin referencia' : servicio.kilometros_restantes < 0 ? `Excedido por ${Math.abs(servicio.kilometros_restantes).toLocaleString()} km` : `${Number(servicio.kilometros_restantes).toLocaleString()} km`, servicio.estado_alerta === 'Proximo' ? 'Próximo' : servicio.estado_alerta];
            valores.forEach((valor, index) => {
                const td = document.createElement('td');
                if (index === valores.length - 1) {
                    const estado = document.createElement('span');
                    const colores = {Pendiente: 'pending', Proximo: 'upcoming', Urgente: 'urgent', 'Servicio pasado': 'urgent'};
                    estado.className = `maintenance-status ${colores[servicio.estado_alerta] || ''}`;
                    estado.textContent = valor; td.append(estado);
                    const lineaEstado = document.createElement('div');
                    lineaEstado.className = 'maintenance-status-line';
                    td.replaceChildren(lineaEstado);
                    lineaEstado.append(estado);
                    if (servicio.kilometros_restantes != null && Number(servicio.kilometros_restantes) < 500) {
                        const avisos = Number(servicio.notificaciones_cliente || 0);
                        const contador = document.createElement('span');
                        contador.className = 'maintenance-notification-count';
                        contador.title = `${avisos} de 3 avisos preparados en WhatsApp`;
                        contador.setAttribute('aria-label', `${avisos} de 3 avisos preparados`);
                        contador.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg><span>' + avisos + '/3</span>';
                        lineaEstado.append(contador);
                    }
                } else td.textContent = valor ?? '';
                tr.append(td);
            });
            return tr;
        }));
        document.getElementById('dashboardMensaje').textContent = data.servicios.length ? '' : 'No hay mantenimientos programados.';
    } catch (error) {
        for (const key of ['vehiculos', 'proximos', 'vencidos', 'enTaller']) document.getElementById('indicador-' + key).textContent = '--';
        tablaServiciosInicio.replaceChildren();
        document.getElementById('dashboardMensaje').textContent = `No se pudo cargar el panel: ${error.message}`;
    } finally {
        dashboardLoading = false;
        if (dashboardRefreshQueued && !document.hidden) {
            dashboardRefreshQueued = false;
            queueMicrotask(cargarDashboard);
        }
    }
}
if (tablaServiciosInicio) {
    cargarDashboard();
    setInterval(() => { if (!document.hidden) cargarDashboard(); }, 60000);
    window.addEventListener('focus', cargarDashboard);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) cargarDashboard(); });
    window.addEventListener('mantenimiento:recordatorio-registrado', cargarDashboard);
}
