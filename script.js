let servicios = JSON.parse(localStorage.getItem('servicios_datatrack')) || [];
let filtroTiempoActual = 'todos';

function toggleOtroTecnico() {
    const select = document.getElementById('tecnicoSelect');
    const inputOtro = document.getElementById('otroTecnico');
    const isOtro = select.value === 'Otro';
    inputOtro.classList.toggle('d-none', !isOtro);
    inputOtro.required = isOtro;
}

document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();

    const tecnicoFinal = document.getElementById('tecnicoSelect').value === 'Otro' 
        ? document.getElementById('otroTecnico').value 
        : document.getElementById('tecnicoSelect').value;

    const nuevo = {
        id: Date.now(),
        tecnico: tecnicoFinal,
        whatsapp: document.getElementById('telTecnico').value,
        email: document.getElementById('emailTecnico').value,
        despachador: document.getElementById('despachador').value,
        cliente: document.getElementById('cliente').value,
        equipo: document.getElementById('equipo').value,
        descripcion: document.getElementById('descripcion').value,
        ubicacion: document.getElementById('ubicacion').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value
    };

    // --- VALIDACIÓN DE CRUCE DE HORARIOS ---
    const choque = servicios.some(s => {
        return s.tecnico === nuevo.tecnico && 
               (new Date(nuevo.inicio) < new Date(s.fin) && new Date(nuevo.fin) > new Date(s.inicio));
    });

    if (choque) {
        alert(`❌ ¡CRUCE DETECTADO! El técnico ${nuevo.tecnico} ya tiene una tarea asignada en ese horario.`);
        return;
    }

    servicios.push(nuevo);
    localStorage.setItem('servicios_datatrack', JSON.stringify(servicios));
    this.reset();
    toggleOtroTecnico();
    renderizarTabla();
    alert("✅ Servicio registrado correctamente.");
});

function setFiltroTiempo(periodo) {
    filtroTiempoActual = periodo;
    renderizarTabla();
}

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busqueda = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    const ahora = new Date();
    const hoyStr = ahora.toISOString().split('T')[0];
    const manana = new Date(); manana.setDate(ahora.getDate() + 1);
    const mananaStr = manana.toISOString().split('T')[0];

    let contadorHoy = 0;

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        const fechaServicio = s.inicio.split('T')[0];
        if(fechaServicio === hoyStr) contadorHoy++;

        // Lógica de Filtros de Tiempo
        let pasaTiempo = true;
        if(filtroTiempoActual === 'hoy') pasaTiempo = (fechaServicio === hoyStr);
        if(filtroTiempoActual === 'manana') pasaTiempo = (fechaServicio === mananaStr);
        if(filtroTiempoActual === 'semana') {
            const finSemana = new Date(); finSemana.setDate(ahora.getDate() + 7);
            pasaTiempo = (new Date(s.inicio) >= ahora && new Date(s.inicio) <= finSemana);
        }

        if(pasaTiempo && (s.tecnico.toLowerCase().includes(busqueda) || s.cliente.toLowerCase().includes(busqueda))) {
            const msgBody = `🚨 *DATATRACK: NUEVA TAREA*\n\n👤 *Técnico:* ${s.tecnico}\n🏢 *Cliente:* ${s.cliente}\n🛠️ *Equipo:* ${s.equipo}\n📝 *Tarea:* ${s.descripcion}\n📍 *Ciudad:* ${s.ubicacion}\n🏠 *Dir:* ${s.direccion}\n⏰ *Horario:* ${s.inicio.replace('T', ' ')}\n✍️ *Asigna:* ${s.despachador}`;
            const msgWA = encodeURIComponent(msgBody);
            const msgMail = `mailto:${s.email}?subject=Asignación Datatrack: ${s.cliente}&body=${msgWA}`;

            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold text-dark">${s.tecnico}</span><br><small class="text-muted">${s.ubicacion}</small></td>
                    <td><span class="badge badge-equipo mb-1">${s.equipo}</span><br><small>${s.cliente}</small></td>
                    <td><small class="fw-bold">${s.inicio.split('T')[0]}</small><br><small>${s.inicio.split('T')[1]}</small></td>
                    <td>
                        <div class="btn-group">
                            <a href="https://wa.me/${s.whatsapp}?text=${msgWA}" target="_blank" class="btn btn-whatsapp btn-sm">WA</a>
                            <a href="${msgMail}" class="btn btn-email btn-sm">Mail</a>
                            <button onclick="eliminarServicio(${s.id})" class="btn btn-light btn-sm text-danger">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        }
    });

    document.getElementById('contadorHoy').innerText = `Servicios para hoy: ${contadorHoy}`;
}

// --- EXPORTACIÓN A EXCEL (.XLSX) ---
function exportarExcel() {
    if (servicios.length === 0) return alert("No hay datos para exportar.");

    const datosExcel = servicios.map(s => ({
        "Inicio": s.inicio.replace('T', ' '),
        "Técnico": s.tecnico,
        "Asignado Por": s.despachador,
        "Cliente": s.cliente,
        "Equipo": s.equipo,
        "Ciudad": s.ubicacion,
        "Dirección": s.direccion,
        "Descripción": s.descripcion,
        "Tel Técnico": s.whatsapp,
        "Email": s.email
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    // Auto-ajustar columnas
    const wscols = [{wch:18}, {wch:20}, {wch:15}, {wch:20}, {wch:10}, {wch:15}, {wch:25}, {wch:35}, {wch:15}, {wch:25}];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Agenda Datatrack");
    XLSX.writeFile(wb, `Agenda_Datatrack_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function eliminarServicio(id) {
    if(confirm('¿Deseas eliminar este servicio de la agenda?')) {
        servicios = servicios.filter(s => s.id !== id);
        localStorage.setItem('servicios_datatrack', JSON.stringify(servicios));
        renderizarTabla();
    }
}

// Inicializar tabla al cargar
document.addEventListener('DOMContentLoaded', renderizarTabla);