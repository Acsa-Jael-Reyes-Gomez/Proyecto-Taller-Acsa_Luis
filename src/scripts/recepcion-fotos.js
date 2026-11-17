(() => {
    const field = id => document.getElementById(id), api = window.api.recepcion.fotos;
    const message = field('mensajeFotosRecepcion'), qrDialog = field('qrFotosDialog');
    let id = null, version = 0, loading = false, busy = false, qrId = null, placa = "", saving = false;
    const currentPlate = () => field("recepcionVehiculo").value.trim().toUpperCase();
    async function ensureDraft() { if (!id) { placa=currentPlate(); if (!placa) throw new Error("Selecciona la placa del vehiculo actual."); id=await api.begin(placa); } return id; }
    function buttons() { for (const remove of document.querySelectorAll('.reception-photo-remove')) remove.disabled = busy || saving; for (const name of ['subirFotosRecepcion','qrFotosRecepcion']) field(name).disabled = !currentPlate() || busy || saving; }
    async function refresh() {
        if (!id || loading) return;
        loading = true; const snapshot = id, current = version;
        try {
            const photos = await api.list(snapshot);
            if (current !== version) return;
            const nodes = photos.map((photo, index) => {
                const card = document.createElement('figure'), caption = document.createElement('figcaption');
                const nombreVisible = `Foto ${index + 1}`;
                caption.textContent = `${nombreVisible} · ${photo.origen}`;
                if (photo.miniatura) {
                    const button = document.createElement('button'), image = document.createElement('img');
                    button.type = 'button'; button.setAttribute('aria-label', `Ver ${nombreVisible}`); image.src = photo.miniatura; image.alt = nombreVisible;
                    button.append(image); button.addEventListener('click', async () => {
                        try { const full = await api.view(snapshot, photo.id_foto); if (snapshot !== id) return; field('verFotoRecepcionImagen').src = full; field('verFotoRecepcionDialog').showModal(); }
                        catch (error) { message.textContent = error.message; }
                    }); card.append(button);
                } else { const error = document.createElement('p'); error.textContent = photo.error; card.append(error); }
                const remove = document.createElement('button');
                remove.type = 'button'; remove.className = 'reception-photo-remove'; remove.textContent = '\u00d7';
                remove.setAttribute('aria-label', `Quitar ${nombreVisible}`); remove.disabled = busy || saving;
                remove.addEventListener('click', async () => {
                    if (busy || saving || snapshot !== id) return;
                    busy = true; buttons();
                    try { await api.remove(snapshot, photo.id_foto); message.textContent = ''; await refresh(); }
                    catch (error) { message.textContent = error.message; }
                    finally { busy = false; buttons(); }
                });
                card.append(remove, caption); return card;
            });
            field('galeriaFotosRecepcion').replaceChildren(...nodes);
            if (!message.textContent || message.dataset.count === 'true') { message.textContent = `${photos.length} foto(s) listas para guardar. Maximo 20; JPG, PNG o WEBP, hasta 10 MB por foto.`; message.dataset.count = 'true'; }
        } catch (error) { if (current === version) { message.textContent = `No se pudieron cargar las fotos: ${error.message}`; message.dataset.count = ''; } }
        finally { loading = false; if (current !== version && id) refresh(); }
    }
    async function reset() {
        const previous=id; version++; id=null; placa=''; qrId=null;
        if(qrDialog.open) qrDialog.close();
        field('galeriaFotosRecepcion').replaceChildren(); message.textContent=''; buttons();
        if(previous) await api.discard(previous).catch(()=>{});
    }
    window.recepcionFotos={
        estado:()=>id,
        restaurar:async value=>{if(value){id=value;placa=currentPlate();buttons();await refresh();}},
        prepararGuardado:async()=>{ if(busy) throw new Error('Espera a que termine la carga de fotos.'); saving=true; buttons(); return id; },
        terminarGuardado:()=>{saving=false;buttons();},
        guardada:()=>reset()
    };
    field('formRecepcion').addEventListener('reset',()=>{reset();setTimeout(buttons,0);});
    field('recepcionVehiculo').addEventListener('input',()=>{if(id && currentPlate()!==placa) reset();buttons();});
    field('recepcionVehiculo').addEventListener('change',()=>{if(id && currentPlate()!==placa) reset();buttons();});
    field('cambiarPlacaRecepcion').addEventListener('click',()=>{reset();buttons();});
    field('subirFotosRecepcion').addEventListener('click', async () => {
        if (busy || saving) return; busy = true; buttons();
        try { await ensureDraft(); const result = await api.upload(id); await refresh(); if (result.guardadas || result.errores.length) { message.textContent = `${result.guardadas} foto(s) guardadas. ${result.errores.join(' ')}`; message.dataset.count = ''; } }
        catch (error) { message.textContent = error.message; message.dataset.count = ''; }
        finally { busy = false; buttons(); }
    });
    async function showQr(address) {
        if (busy || saving || !currentPlate()) return; busy = true; buttons(); field('qrFotosDireccion').disabled = true;
        const current = version;
        field('qrFotosImagen').hidden = true;
        field('qrFotosEstado').textContent = 'Preparando tu QR?';
        field('qrFotosEnlace').value = '';
        field('qrFotosVehiculo').textContent = `Veh?culo ? ${currentPlate()}`;
        if (!qrDialog.open) qrDialog.showModal();
        let snapshot;
        try {
            snapshot=await ensureDraft();
            const result = await api.qr(snapshot, address);
            if (current !== version) { await api.revoke(snapshot); return; }
            qrId = snapshot;
            const options = result.addresses.map(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; return option; });
            field('qrFotosDireccion').replaceChildren(...options); field('qrFotosDireccion').value = result.address;
            field('qrFotosImagen').src = result.imagen; field('qrFotosImagen').hidden = false; field('qrFotosEstado').textContent = 'Listo para escanear'; field('qrFotosEnlace').value = result.url;
            field('qrFotosVehiculo').textContent = `Recepcion #${id} · ${result.placa}`;
            field('qrFotosVence').textContent = `Valido hasta ${new Date(result.expires).toLocaleTimeString('es-GT', {hour:'2-digit',minute:'2-digit'})} (20 minutos).`;
            if (!qrDialog.open) qrDialog.showModal();
        } catch (error) { field('qrFotosEstado').textContent = `No se pudo generar el QR: ${error.message}`; message.textContent = field('qrFotosEstado').textContent; }
        finally { busy = false; buttons(); field('qrFotosDireccion').disabled = false; }
    }
    field('qrFotosRecepcion').addEventListener('click', () => showQr());
    field('qrFotosDireccion').addEventListener('change', () => showQr(field('qrFotosDireccion').value));
    async function closeQr() { if (busy) return; if (qrId) await api.revoke(qrId).catch(error => { message.textContent = error.message; }); qrId = null; if (qrDialog.open) qrDialog.close(); }
    field('cerrarQrFotos').addEventListener('click', closeQr);
    qrDialog.addEventListener('cancel', event => { event.preventDefault(); closeQr(); });
    field('cerrarFotoRecepcion').addEventListener('click', () => { field('verFotoRecepcionDialog').close(); field('verFotoRecepcionImagen').removeAttribute('src'); });
    buttons();
    setInterval(() => { if (id && !document.hidden && !busy) refresh(); }, 1500);
})();
