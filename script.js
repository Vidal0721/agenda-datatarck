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

// Manejo de visibilidad de campos "Otro"
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

document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();

    const editId = document.getElementById('editId').value;
    const tecnicoFinal = document.getElementById('tecnicoSelect').value === 'Otro' 
        ? document.getElementById('otroTecnico').value : document.getElementById('tecnicoSelect').value;
    
    const equipoFinal = document.getElementById('equipo').value === 'OTRO' 
        ? document.getElementById('otroEquipo').value : document.getElementById('equipo').value;

    const tareaFinal = document.getElementById('descripcion').value === 'OTRO' 
        ? document.getElementById('otraTarea').value : document.getElementById('descripcion').value;

    const nuevoId = editId ? editId : Date.now();
    const nuevo = {
        id: nuevoId,
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

    // Validación de solapamiento (excluyendo el mismo servicio si se está editando)
    const choque = servicios.some(s => {
        if(editId && s.id == editId) return false;
        const sIni = new Date(s.inicio).getTime();
        const sFin = new Date(s.fin).getTime();
        const nIni = new Date(nuevo.inicio).getTime();
        const nFin = new Date(nuevo.fin).getTime();
        return s.tecnico === nuevo.tecnico && (nIni < sFin && nFin > sIni);
    });

    if (choque) {
        alert(`🚨 ERROR: El técnico ${nuevo.tecnico} ya está ocupado en ese horario.`);
        return;
    }

    db.ref('servicios/' + nuevoId).set(nuevo).then(() => {
        if(editId) cancelarEdicion();
        this.reset();
        alert("✅ Guardado correctamente.");
    });
});

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busqueda = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        if(s.tecnico.toLowerCase().includes(busqueda) || s.placa.toLowerCase().includes(busqueda) || s.cliente.toLowerCase().includes(busqueda)) {
            const msg = encodeURIComponent(`🚨 *DATATRACK: NUEVA TAREA*\n\n👤 *Técnico:* ${s.tecnico}\n🚗 *PLACA:* ${s.placa}\n🛠️ *Equipo:* ${s.equipo}\n📝 *Tarea:* ${s.descripcion}\n📝 *Obs:* ${s.observaciones}\n📍 *Ciudad:* ${s.ubicacion}\n⏰ *Inicio:* ${s.inicio.replace('T', ' ')}\n✍️ *Asigna:* ${s.despachador}`);
            const mailLink = `mailto:${s.email}?subject=Servicio Datatrack: ${s.placa}&body=${msg}`;

            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small>${s.ubicacion}</small></td>
                    <td><span class="badge badge-equipo">${s.equipo}</span> - <span class="text-placa">${s.placa}</span><br><small>${s.descripcion}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td>
                        <div class="btn-group gap-1">
                            <a href="https://wa.me/${s.whatsapp}?text=${msg}" target="_blank" class="btn btn-wsp btn-sm" title="Notificar WhatsApp"><i class="bi bi-whatsapp"></i></a>
                            <a href="${mailLink}" class="btn btn-imei btn-sm" title="Notificar IMEI/Email"><i class="bi bi-envelope-at"></i></a>
                            <button onclick="prepararEdicion('${s.id}')" class="btn btn-edit btn-sm"><i class="bi bi-pencil-square"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-light btn-sm text-danger"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }
    });
    document.getElementById('contadorHoy').innerText = `Total Nacional: ${servicios.length}`;
}

function prepararEdicion(id) {
    const s = servicios.find(item => item.id == id);
    if(!s) return;

    document.getElementById('editId').value = s.id;
    document.getElementById('despachador').value = s.despachador;
    
    // Lógica para select de técnico
    const tSelect = document.getElementById('tecnicoSelect');
    const opcionesT = Array.from(tSelect.options).map(o => o.value);
    if(opcionesT.includes(s.tecnico)) {
        tSelect.value = s.tecnico;
        document.getElementById('otroTecnico').classList.add('d-none');
    } else {
        tSelect.value = "Otro";
        document.getElementById('otroTecnico').value = s.tecnico;
        document.getElementById('otroTecnico').classList.remove('d-none');
    }

    document.getElementById('telTecnico').value = s.whatsapp;
    document.getElementById('emailTecnico').value = s.email;
    document.getElementById('ubicacion').value = s.ubicacion;
    document.getElementById('direccion').value = s.direccion;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('placa').value = s.placa;

    // Equipo
    const eSelect = document.getElementById('equipo');
    const opcionesE = Array.from(eSelect.options).map(o => o.value);
    if(opcionesE.includes(s.equipo)) {
        eSelect.value = s.equipo;
        document.getElementById('otroEquipo').classList.add('d-none');
    } else {
        eSelect.value = "OTRO";
        document.getElementById('otroEquipo').value = s.equipo;
        document.getElementById('otroEquipo').classList.remove('d-none');
    }

    // Tarea
    const dSelect = document.getElementById('descripcion');
    const opcionesD = Array.from(dSelect.options).map(o => o.value);
    if(opcionesD.includes(s.descripcion)) {
        dSelect.value = s.descripcion;
        document.getElementById('otraTarea').classList.add('d-none');
    } else {
        dSelect.value = "OTRO";
        document.getElementById('otraTarea').value = s.descripcion;
        document.getElementById('otraTarea').classList.remove('d-none');
    }

    document.getElementById('observaciones').value = s.observaciones;
    document.getElementById('inicio').value = s.inicio;
    document.getElementById('fin').value = s.fin;

    // Cambiar estilo visual
    document.getElementById('cardForm').classList.add('editing');
    document.getElementById('formTitle').innerText = "Editando Servicio";
    document.getElementById('btnSubmit').innerText = "ACTUALIZAR CAMBIOS";
    document.getElementById('btnCancel').classList.remove('d-none');
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
    if(confirm('¿Eliminar servicio definitivamente?')) db.ref('servicios/' + id).remove();
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
}
