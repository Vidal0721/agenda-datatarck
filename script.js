// CONFIGURACIÓN DE TU PROYECTO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAjh_N7X4nBi6GPnWjexgPX2SKZf7PxW-w",
  authDomain: "agenda-datatrack.firebaseapp.com",
  projectId: "agenda-datatrack",
  storageBucket: "agenda-datatrack.firebasestorage.app",
  messagingSenderId: "818633255134",
  appId: "1:818633255134:web:f0d7dfe7f5caf8c4607a4f",
  measurementId: "G-9YNWWGVVD6"
};

// Inicialización
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let servicios = [];
let filtroTiempoActual = 'todos';

// Escuchar cambios en tiempo real
db.ref('servicios').on('value', (snapshot) => {
    const data = snapshot.val();
    servicios = data ? Object.values(data) : [];
    renderizarTabla();
});

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

    const nuevoId = Date.now();
    const nuevo = {
        id: nuevoId,
        tecnico: tecnicoFinal,
        whatsapp: document.getElementById('telTecnico').value,
        email: document.getElementById('emailTecnico').value,
        despachador: document.getElementById('despachador').value,
        cliente: document.getElementById('cliente').value,
        placa: document.getElementById('placa').value.toUpperCase(),
        equipo: document.getElementById('equipo').value,
        descripcion: document.getElementById('descripcion').value,
        ubicacion: document.getElementById('ubicacion').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value
    };

    // --- VALIDACIÓN GLOBAL (BLOQUEO DE SOLAPAMIENTOS) ---
    const choque = servicios.some(s => {
        return s.tecnico === nuevo.tecnico && 
               (new Date(nuevo.inicio) < new Date(s.fin) && new Date(nuevo.fin) > new Date(s.inicio));
    });

    if (choque) {
        alert(`❌ ¡ERROR DE SOLAPAMIENTO! El técnico ${nuevo.tecnico} ya tiene una tarea asignada en ese horario en la base de datos nacional.`);
        return;
    }

    // Guardar en la Nube
    db.ref('servicios/' + nuevoId).set(nuevo);
    
    this.reset();
    toggleOtroTecnico();
    alert("✅ Servicio guardado en la nube y sincronizado.");
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
    const hoyStr = ahora.toLocaleDateString('en-CA'); 
    let contadorHoy = 0;

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        const fechaServicio = s.inicio.split('T')[0];
        if(fechaServicio === hoyStr) contadorHoy++;

        let pasaTiempo = true;
        if(filtroTiempoActual === 'hoy') pasaTiempo = (fechaServicio === hoyStr);
        if(filtroTiempoActual === 'manana') {
            const m = new Date(); m.setDate(ahora.getDate() + 1);
            pasaTiempo = (fechaServicio === m.toLocaleDateString('en-CA'));
        }
        if(filtroTiempoActual === 'semana') {
            const fSemana = new Date(); fSemana.setDate(ahora.getDate() + 7);
            pasaTiempo = (new Date(s.inicio) >= ahora && new Date(s.inicio) <= fSemana);
        }

        const matchBusqueda = s.tecnico.toLowerCase().includes(busqueda) || 
                            s.cliente.toLowerCase().includes(busqueda) || 
                            s.placa.toLowerCase().includes(busqueda);

        if(pasaTiempo && matchBusqueda) {
            const msgText = `🚨 *DATATRACK: NUEVA TAREA*\n\n👤 *Técnico:* ${s.tecnico}\n🏢 *Cliente:* ${s.cliente}\n🚗 *PLACA:* ${s.placa}\n🛠️ *Equipo:* ${s.equipo}\n📝 *Tarea:* ${s.descripcion}\n📍 *Ciudad:* ${s.ubicacion}\n🏠 *Dir:* ${s.direccion}\n⏰ *Horario:* ${s.inicio.replace('T', ' ')}\n✍️ *Asigna:* ${s.despachador}`;
            const msgWA = encodeURIComponent(msgText);
            const msgMail = `mailto:${s.email}?subject=Asignación Datatrack: ${s.placa}&body=${msgWA}`;

            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small class="text-muted">${s.ubicacion}</small></td>
                    <td><span class="badge badge-equipo mb-1">${s.equipo}</span> - <span class="text-placa">${s.placa}</span><br><small>${s.cliente}</small></td>
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
    document.getElementById('contadorHoy').innerText = `Servicios hoy (Nacional): ${contadorHoy}`;
}

function exportarExcel() {
    if (servicios.length === 0) return alert("No hay datos");
    const datosExcel = servicios.map(s => ({
        "Inicio": s.inicio.replace('T', ' '),
        "Técnico": s.tecnico,
        "Asignado Por": s.despachador,
        "Cliente": s.cliente,
        "Placa": s.placa,
        "Equipo": s.equipo,
        "Ciudad": s.ubicacion,
        "Dirección": s.direccion,
        "Descripción": s.descripcion,
        "WhatsApp": s.whatsapp,
        "Email": s.email
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, `Reporte_Datatrack_Nacional.xlsx`);
}

function eliminarServicio(id) {
    if(confirm('¿Deseas eliminar este registro de la base de datos nacional?')) {
        db.ref('servicios/' + id).remove();
    }
}

