// CONFIGURACIÓN FIREBASE DATATRACK
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

// Funciones para manejar campos "OTRO"
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

    const tecnicoFinal = document.getElementById('tecnicoSelect').value === 'Otro' 
        ? document.getElementById('otroTecnico').value : document.getElementById('tecnicoSelect').value;
    
    const equipoFinal = document.getElementById('equipo').value === 'OTRO' 
        ? document.getElementById('otroEquipo').value : document.getElementById('equipo').value;

    const tareaFinal = document.getElementById('descripcion').value === 'OTRO' 
        ? document.getElementById('otraTarea').value : document.getElementById('descripcion').value;

    const nuevoId = Date.now();
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

    // --- BLOQUEO DE SOLAPAMIENTO ESTRICTO ---
    const choque = servicios.some(s => {
        const sIni = new Date(s.inicio).getTime();
        const sFin = new Date(s.fin).getTime();
        const nIni = new Date(nuevo.inicio).getTime();
        const nFin = new Date(nuevo.fin).getTime();
        return s.tecnico === nuevo.tecnico && (nIni < sFin && nFin > sIni);
    });

    if (choque) {
        alert(`🚨 ERROR: El técnico ${nuevo.tecnico} ya tiene una tarea programada en este horario.`);
        return;
    }

    db.ref('servicios/' + nuevoId).set(nuevo);
    this.reset();
    toggleOtroTecnico(); toggleOtroEquipo(); toggleOtraTarea();
    alert("✅ Registrado en la base nacional.");
});

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busqueda = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        if(s.tecnico.toLowerCase().includes(busqueda) || s.placa.toLowerCase().includes(busqueda) || s.cliente.toLowerCase().includes(busqueda)) {
            const msg = encodeURIComponent(`🚨 *DATATRACK: NUEVA TAREA*\n\n👤 *Técnico:* ${s.tecnico}\n🚗 *PLACA:* ${s.placa}\n🛠️ *Equipo:* ${s.equipo}\n📝 *Tarea:* ${s.descripcion}\n📝 *Obs:* ${s.observaciones}\n📍 *Ciudad:* ${s.ubicacion}\n⏰ *Inicio:* ${s.inicio.replace('T', ' ')}\n✍️ *Asigna:* ${s.despachador}`);
            
            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small>${s.ubicacion}</small></td>
                    <td><span class="badge badge-equipo">${s.equipo}</span> - <span class="text-placa">${s.placa}</span><br><small>${s.descripcion}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td>
                        <div class="btn-group">
                            <a href="https://wa.me/${s.whatsapp}?text=${msg}" target="_blank" class="btn btn-whatsapp btn-sm">WA</a>
                            <button onclick="eliminar(${s.id})" class="btn btn-light btn-sm text-danger">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        }
    });
    document.getElementById('contadorHoy').innerText = `Total Nacional: ${servicios.length}`;
}

function eliminar(id) {
    if(confirm('¿Eliminar de la nube?')) db.ref('servicios/' + id).remove();
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Agenda_Nacional_Datatrack.xlsx");
}


