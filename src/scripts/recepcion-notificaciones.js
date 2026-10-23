(function (root) {
    function esperaVencida(orden, ahora = new Date()) {
        if (orden.estado !== 'Espera' || !orden.fechaCreacion) return false;
        const inicio = new Date(String(orden.fechaCreacion).replace(' ', 'T'));
        return Number.isFinite(inicio.getTime()) && ahora.getTime() - inicio.getTime() > 24 * 60 * 60 * 1000;
    }
    function resumirNotificaciones(ordenes, servicios) {
        const espera = ordenes.filter(orden => orden.estado === 'Espera');
        const pendientes = servicios.filter(servicio => ['Proximo', 'Urgente', 'Servicio pasado'].includes(servicio.estado_alerta));
        return { espera, pendientes, vehiculos: new Set(pendientes.map(s => s.id_vehiculo || s.placa)).size };
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { resumirNotificaciones, esperaVencida }; return;
    }
    const field = id => document.getElementById(id);
    const bell = field('campanaRecepcion');
    if (!bell) return;
    const panel = field('panelNotificacionesRecepcion');
    let loading = false;
    function node(tag, text, className) {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }
    function link(label, href) {
        const element = node('a', label); element.href = href; return element;
    }
    async function actualizar() {
        if (loading) return;
        loading = true;
        try {
            const [ordenes, dashboard, vehicles, clients] = await Promise.all([
                root.api.ordenes.list(), root.api.dashboard.get(), root.api.vehiculos.list(), root.api.pilotos.list()
            ]);
            const data = resumirNotificaciones(ordenes, dashboard.servicios);
            field('cantidadNotificacionesRecepcion').textContent = data.espera.length + data.vehiculos;
            bell.setAttribute('aria-label', `${data.espera.length} ordenes en espera y ${data.vehiculos} vehiculos con mantenimiento pendiente`);
            field('mensajeNotificacionesRecepcion').textContent = '';
            const summary = node('div', '', 'notification-summary');
            summary.append(node('p', `${data.espera.length} ordenes en espera`), node('p', `${data.vehiculos} vehiculos con servicios Proximos, Urgentes o Pasados`));
            field('resumenNotificacionesRecepcion').replaceChildren(summary);
            const list = field('listaNotificacionesRecepcion');
            list.replaceChildren();
            if (data.espera.length) {
                list.append(node('h3', 'Ordenes por completar'));
                const ahora = new Date();
                for (const order of data.espera) {
                    const vencida = esperaVencida(order, ahora);
                    const item = node('div', '', `notification-item${vencida ? ' notification-wait-overdue' : ''}`);
                    item.append(node('strong', order.placa), node('p', `${order.piloto || 'Sin cliente asignado'} | En espera`));
                    if (vencida) item.append(node('span', 'Mas de 24 horas en espera', 'notification-status overdue'));
                    item.append(link('Ver ordenes en espera', 'ordenes-trabajo.html?estado=Espera'));
                    list.append(item);
                }
            }
            if (data.pendientes.length) list.append(node('h3', 'Contactar al cliente / coordinar cita'));
            for (const service of data.pendientes) {
                const vehicle = vehicles.find(v => v.id === Number(service.id_vehiculo) || v.placa === service.placa);
                const client = clients.find(c => c.id === vehicle?.idCliente);
                const item = node('div', '', 'notification-item');
                item.append(node('strong', `${service.placa} | ${service.servicio}`));
                const statusClasses = { Proximo: 'upcoming', Urgente: 'urgent', 'Servicio pasado': 'overdue' };
                item.append(node('span', service.estado_alerta, `notification-status ${statusClasses[service.estado_alerta]}`));
                item.append(node('p', `Cliente: ${client?.nombre || service.propietario || 'Sin cliente vinculado'}`));
                if (client?.telefono) item.append(node('p', `Telefono: ${client.telefono}`));
                const reasons = [];
                if (service.dias_restantes != null) {
                    const days = Number(service.dias_restantes);
                    reasons.push(`Fecha de servicio: ${service.fecha_proximo_servicio || 'Sin fecha'} (${days === 0 ? 'vence hoy' : days < 0 ? `vencido hace ${Math.abs(days)} dias` : `faltan ${days} dias`})`);
                }
                if (service.kilometros_restantes != null) {
                    const km = Number(service.kilometros_restantes);
                    reasons.push(`Km para servicio: ${Number(service.kilometraje_proximo).toLocaleString()} (${km === 0 ? 'kilometraje alcanzado' : km < 0 ? `excedido por ${Math.abs(km).toLocaleString()} km` : `faltan ${km.toLocaleString()} km`})`);
                }
                for (const reason of reasons) item.append(node('p', reason));
                const notify = node('button', 'Notificar a cliente', 'notification-whatsapp');
                notify.type = 'button';
                notify.disabled = !client?.telefono;
                notify.title = client?.telefono ? 'Abrir WhatsApp con el mensaje preparado' : 'El cliente no tiene un telefono registrado';
                notify.addEventListener('click', async () => {
                    const message = `Hola ${client.nombre}, le saludamos de Taller. El servicio ${service.servicio} de su vehiculo con placa ${service.placa} esta en estado ${service.estado_alerta}. ${reasons.join('. ')}. Contactenos para coordinar una cita de mantenimiento.`;
                    try {
                        await root.api.whatsapp.abrir(client.telefono, message);
                        field('mensajeNotificacionesRecepcion').textContent = 'WhatsApp abierto con el mensaje preparado. Pulsa Enviar en WhatsApp para notificar al cliente.';
                    } catch (error) { field('mensajeNotificacionesRecepcion').textContent = `No se pudo abrir WhatsApp: ${error.message}`; }
                });
                item.append(notify);
                item.append(link('Ver agenda de mantenimiento', 'dashboard.html'));
                list.append(item);
            }
            if (!data.espera.length && !data.pendientes.length) list.append(node('p', 'No hay avisos pendientes.'));
        } catch (error) {
            field('cantidadNotificacionesRecepcion').textContent = '--';
            field('resumenNotificacionesRecepcion').replaceChildren();
            field('listaNotificacionesRecepcion').replaceChildren();
            field('mensajeNotificacionesRecepcion').textContent = `No se pudieron actualizar las notificaciones: ${error.message}`;
        } finally { loading = false; }
    }
    bell.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        bell.setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) actualizar();
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('.recepcion-notifications')) {
            panel.hidden = true; bell.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) {
            panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); bell.focus();
        }
    });
    root.recepcionNotificaciones = { actualizar };
    actualizar();
    root.addEventListener('focus', actualizar);
    setInterval(() => { if (!document.hidden) actualizar(); }, 60000);
})(typeof window !== 'undefined' ? window : globalThis);
