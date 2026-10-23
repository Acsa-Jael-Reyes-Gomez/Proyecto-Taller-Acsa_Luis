(function (root) {
    function crearDocumento(document, reception) {
        const article = document.createElement('article');
        article.className = 'documento-hoja';
        function text(tag, value, className, parent = article) {
            const node = document.createElement(tag);
            node.textContent = value;
            if (className) node.className = className;
            parent.append(node); return node;
        }
        const header = text('header', '', 'documento-header');
        const heading = text('div', '', '', header);
        text('p', 'TALLER MECANICO', 'documento-brand', heading);
        text('h1', 'Constancia de recepcion de vehiculo', '', heading).id = 'tituloDocumentoRecepcion';
        text('p', 'Registro de ingreso y custodia', 'documento-subtitulo', heading);
        const reference = text('div', '', 'documento-referencia', header);
        text('strong', `Ficha #${reception.id_recepcion}`, '', reference);
        text('p', `Fecha de ingreso: ${reception.fecha_ingreso}`, '', reference);
        function section(title) {
            const node = text('section', '', 'documento-seccion');
            text('h2', title, '', node); return node;
        }
        const data = section('01 / Datos del ingreso');
        const grid = text('div', '', 'documento-datos', data);
        for (const [label, value] of [['Cliente / propietario', reception.cliente], ['Placa', reception.placa], ['Vehiculo', reception.vehiculo], ['Kilometraje de ingreso', `${Number(reception.kilometraje).toLocaleString()} km`], ['Perfil de uso', reception.nivel_uso], ['Mecanico asignado', reception.mecanico || 'Sin asignar']]) {
            const item = text('div', '', 'documento-dato', grid);
            text('span', label, 'documento-etiqueta', item);
            text('strong', value, '', item);
        }
        text('p', reception.motivo, 'documento-texto', section('02 / Motivo del ingreso'));
        const custody = section('03 / Estado de ingreso y custodia');
        text('p', `Nivel de combustible: ${reception.combustible}`, 'documento-combustible', custody);
        const table = text('table', '', 'documento-checklist', custody);
        const thead = text('thead', '', '', table);
        const headrow = text('tr', '', '', thead);
        text('th', 'Elemento', '', headrow); text('th', 'Estado al ingreso', '', headrow);
        const tbody = text('tbody', '', '', table);
        for (const [label, value] of [['Espejos', reception.espejos], ['Bateria', reception.bateria], ['Documentos', reception.documentos]]) {
            const row = text('tr', '', '', tbody);
            text('td', label, '', row); text('td', Number(value) ? 'Presente' : 'No presente', '', row);
        }
        text('p', reception.observaciones || 'Sin observaciones.', 'documento-texto', section('04 / Rayones, golpes previos y observaciones'));
        const conformity = section('05 / Conformidad del cliente');
        text('p', 'Declaro que he revisado los datos de esta ficha y estoy conforme con el estado del vehiculo, el nivel de combustible, los elementos presentes y las observaciones registrados al ingresar al taller.', 'documento-conformidad', conformity);
        const signatures = text('div', '', 'documento-firmas', conformity);
        for (const label of ['Firma del cliente / propietario', 'Firma de quien recibe en el taller']) {
            const line = document.createElement('div');
            line.textContent = label; signatures.append(line);
        }
        text('footer', `Recepcion #${reception.id_recepcion} | Constancia de ingreso al taller`, 'documento-footer');
        return article;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { crearDocumento };
    else root.recepcionDocumento = { crearDocumento };
})(typeof window !== 'undefined' ? window : globalThis);
