// CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAjh_N7X4nBi6GPnWjexgPX2SKZf7PxW-w",
  authDomain: "agenda-datatrack.firebaseapp.com",
  projectId: "agenda-datatrack",
  storageBucket: "agenda-datatrack.firebasestorage.app",
  messagingSenderId: "818633255134",
  appId: "1:818633255134:web:f0d7dfe7f5caf8c4607a4f",
  measurementId: "G-9YNWWGVVD6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let servicios = [];
let filtroTiempoActual = 'todos';

// Manejo de visibilidad "Otro"
function toggleOtroTecnico() {
    const v = document.getElementById('tecnicoSelect').value;
    const i = document.getElementById('otroTecnico');
    i.classList.toggle('d-none', v !== 'Otro');
    i.required = (v === 'Otro');
}
function toggleOtroEquipo() {
    const v = document.getElementById('equipo').value;
    const i = document.getElementById('otroEquipo');
    i.classList.toggle('d-none', v !== 'OTRO');
    i.required = (v === 'OTRO');
}
function toggleOtraTarea() {
    const v = document.getElementById('descripcion').value;
    const i = document.getElementById('otraTarea');
    i.classList.toggle('d-none', v !== 'OTRO');
    i.required = (v === 'OTRO');
}

// Sincronización en tiempo real
db.ref('servicios').on('value', (snapshot) => {
    const data = snapshot.val();
    servicios = data ? Object.values(data) : [];
    renderizarTabla();
});

function setFiltroTiempo(periodo) {
    filtroTiempoActual = periodo;
    renderizarTabla();
}

// --- SOLAPAMIENTO MATEMÁTICO ---
function hayChoque(nuevo, editId) {
    const nIni = new Date(nuevo.inicio).getTime();
    const nFin = new Date(nuevo.fin).getTime();

    return servicios.some(s => {
        if (editId && s.id == editId) return false;
        if (s.tecnico !== nuevo.tecnico) return false;

        const sIni = new Date(s.inicio).getTime();
        const sFin = new Date(s.fin).getTime();

        return (nIni < sFin && nFin > sIni); // Intersección de intervalos
    });
}

document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    const tecnicoFinal = document.getElementById('tecnicoSelect').value === 'Otro' ? document.getElementById('otroTecnico').value : document.getElementById('tecnicoSelect').value;
    const equipoFinal = document.getElementById('equipo').value === 'OTRO' ? document.getElementById('otroEquipo').value : document.getElementById('equipo').value;
    const tareaFinal = document.getElementById('descripcion').value === 'OTRO' ? document.getElementById('otraTarea').value : document.getElementById('descripcion').value;

    const nuevo = {
        id: editId ? parseInt(editId) : Date.now(),
        tecnico: tecnicoFinal,
        whatsapp: document.getElementById('telTecnico').value,
        email: document.getElementById('emailTecnico').value,
        despachador: document.getElementById('despachador').value,
        cliente: document.getElementById('cliente').value,
        placa: document.getElementById('placa').value.toUpperCase(),
        equipo: equipoFinal,
        descripcion: tareaFinal,
        observaciones: document.getElementById('observaciones').value || "N/A",
        ubicacion: document.getElementById('ubicacion').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value
    };

    if (hayChoque(nuevo, editId)) {
        alert(`🚨 CHOQUE DE HORARIO: El técnico ${nuevo.tecnico} ya tiene una tarea en ese rango.`);
        return;
    }

    db.ref('servicios/' + nuevo.id).set(nuevo).then(() => {
        if(editId) cancelarEdicion();
        this.reset();
        toggleOtroTecnico(); toggleOtroEquipo(); toggleOtraTarea();
        alert("✅ Sincronizado correctamente.");
    });
});

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busqueda = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    const ahora = new Date();
    const hoyStr = ahora.toLocaleDateString('en-CA');
    const ayerDate = new Date(); ayerDate.setDate(ahora.getDate() - 1);
    const ayerStr = ayerDate.toLocaleDateString('en-CA');

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        const fechaS = s.inicio.split('T')[0];
        const dateS = new Date(s.inicio);
        
        // FILTROS TEMPORALES
        let pasaT = true;
        if(filtroTiempoActual === 'hoy') pasaT = (fechaS === hoyStr);
        if(filtroTiempoActual === 'ayer') pasaT = (fechaS === ayerStr);
        if(filtroTiempoActual === 'semana') {
            const fSemana = new Date(); fSemana.setDate(ahora.getDate() + 7);
            pasaT = (dateS >= ahora && dateS <= fSemana);
        }
        if(filtroTiempoActual === 'mes') {
            pasaT = (dateS.getMonth() === ahora.getMonth() && dateS.getFullYear() === ahora.getFullYear());
        }

        const matchB = s.tecnico.toLowerCase().includes(busqueda) || s.cliente.toLowerCase().includes(busqueda) || s.placa.toLowerCase().includes(busqueda);

        if(pasaT && matchB) {
            const msg = encodeURIComponent(`🚨 *DATATRACK: NUEVA TAREA*\n\n👤 *Técnico:* ${s.tecnico}\n🚗 *PLACA:* ${s.placa}\n🛠️ *Equipo:* ${s.equipo}\n📝 *Tarea:* ${s.descripcion}\n📝 *Obs:* ${s.observaciones}\n📍 *Ciudad:* ${s.ubicacion}\n⏰ *Inicio:* ${s.inicio.replace('T', ' ')}\n✍️ *Asigna:* ${s.despachador}`);
            
            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small class="text-muted">${s.ubicacion}</small></td>
                    <td><span class="badge badge-equipo">${s.equipo}</span> - <span class="text-placa">${s.placa}</span><br><small>${s.descripcion}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td>
                        <div class="btn-group gap-1">
                            <a href="https://wa.me/${s.whatsapp}?text=${msg}" target="_blank" class="btn btn-wsp btn-sm"><i class="bi bi-whatsapp"></i></a>
                            <a href="mailto:${s.email}?body=${msg}" class="btn btn-imei btn-sm"><i class="bi bi-envelope-at"></i></a>
                            <button onclick="prepararEdicion('${s.id}')" class="btn btn-edit btn-sm"><i class="bi bi-pencil-square"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-light btn-sm text-danger"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }
    });
    document.getElementById('contadorHoy').innerText = `Total: ${servicios.length}`;
}

function prepararEdicion(id) {
    const s = servicios.find(i => i.id == id);
    if(!s) return;

    document.getElementById('editId').value = s.id;
    document.getElementById('despachador').value = s.despachador;
    
    // Validar selects
    const ts = document.getElementById('tecnicoSelect');
    if([...ts.options].some(o => o.value === s.tecnico)) { ts.value = s.tecnico; } 
    else { ts.value = "Otro"; document.getElementById('otroTecnico').value = s.tecnico; }
    
    const es = document.getElementById('equipo');
    if([...es.options].some(o => o.value === s.equipo)) { es.value = s.equipo; } 
    else { es.value = "OTRO"; document.getElementById('otroEquipo').value = s.equipo; }

    const ds = document.getElementById('descripcion');
    if([...ds.options].some(o => o.value === s.descripcion)) { ds.value = s.descripcion; } 
    else { ds.value = "OTRO"; document.getElementById('otraTarea').value = s.descripcion; }

    document.getElementById('telTecnico').value = s.whatsapp;
    document.getElementById('emailTecnico').value = s.email;
    document.getElementById('ubicacion').value = s.ubicacion;
    document.getElementById('direccion').value = s.direccion;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('placa').value = s.placa;
    document.getElementById('observaciones').value = s.observaciones;
    document.getElementById('inicio').value = s.inicio;
    document.getElementById('fin').value = s.fin;

    document.getElementById('cardForm').classList.add('editing');
    document.getElementById('formTitle').innerText = "Editando Servicio";
    document.getElementById('btnSubmit').innerText = "ACTUALIZAR CAMBIOS";
    document.getElementById('btnCancel').classList.remove('d-none');
    toggleOtroTecnico(); toggleOtroEquipo(); toggleOtraTarea();
    window.scrollTo(0,0);
}

function cancelarEdicion() {
    document.getElementById('editId').value = "";
    document.getElementById('formServicio').reset();
    document.getElementById('cardForm').classList.remove('editing');
    document.getElementById('formTitle').innerText = "Nueva Asignación";
    document.getElementById('btnSubmit').innerText = "GUARDAR";
    document.getElementById('btnCancel').classList.add('d-none');
    toggleOtroTecnico(); toggleOtroEquipo(); toggleOtraTarea();
}

function eliminar(id) {
    if(confirm('¿Eliminar servicio?')) db.ref('servicios/' + id).remove();
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
}


