const usuariosTabla = document.getElementById('usuariosTabla');
const usuariosEstado = document.getElementById('usuariosEstado');

async function cargarUsuarios() {
    usuariosEstado.textContent = 'Cargando usuarios...';
    try {
        const usuarios = await window.api.usuarios.list();
        usuariosTabla.replaceChildren(...usuarios.map(usuario => {
            const row = document.createElement('tr');
            for (const value of [usuario.nombre, usuario.apellido, usuario.usuario]) { const cell = document.createElement('td'); cell.textContent = value || '—'; row.append(cell); }
            const statusCell = document.createElement('td');
            const status = document.createElement('span'); status.className = `user-status${usuario.estado === 'Activo' ? '' : ' is-inactive'}`; status.textContent = usuario.estado; statusCell.append(status); row.append(statusCell);
            const lastAccess = document.createElement('td'); lastAccess.textContent = usuario.ultimo_acceso || 'Sin ingresos'; row.append(lastAccess);
            const roleCell = document.createElement('td');
            const select = document.createElement('select'); select.className = 'users-role-select'; select.setAttribute('aria-label', `Rol de ${usuario.usuario}`);
            for (const role of ['Administrador', 'Empleado']) { const option = document.createElement('option'); option.value = role; option.textContent = role; option.selected = usuario.rol === role; select.append(option); }
            select.addEventListener('change', async () => {
                select.disabled = true;
                try { await window.api.usuarios.setRole(usuario.id, select.value); usuario.rol = select.value; usuariosEstado.textContent = `Rol de ${usuario.usuario} actualizado.`; }
                catch (error) { select.value = usuario.rol; await window.ui.alert(error.message); }
                finally { select.disabled = false; }
            });
            roleCell.append(select); row.append(roleCell); return row;
        }));
        usuariosEstado.textContent = `${usuarios.length} usuarios registrados. El administrador es el único rol que puede cambiar roles.`;
    } catch (error) { usuariosTabla.replaceChildren(); usuariosEstado.textContent = 'No se pudo cargar la lista de usuarios.'; await window.ui.alert(error.message); }
}

cargarUsuarios();
