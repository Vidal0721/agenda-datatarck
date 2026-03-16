const firebaseConfig = {
    apiKey: "AIzaSyAjh_N7X4nBi6GPnWjxegPX2SKZf7PxW-w",
    authDomain: "agenda-datatrack.firebaseapp.com",
    databaseURL: "https://agenda-datatrack-default-rtdb.firebaseio.com",
    projectId: "agenda-datatrack",
    storageBucket: "agenda-datatrack.firebasestorage.app",
    messagingSenderId: "818633255134",
    appId: "1:818633255134:web:f0d7dfe7f5caf8c4607a4f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let servicios = [];
let esAdmin = false;
let filtroActual = 'todos';

function login() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(() => alert("Credenciales incorrectas"));
}

function accesoTecnico() {
    esAdmin = false;
    activarVistas("VISTA TÉCNICO");
}

function logout() { auth.signOut().then(() => location.reload()); }

auth.onAuthStateChanged(user => {
    if (user) {
        esAdmin = true;
        activarVistas("DESPACHADOR: " + user.email);
    }
});

function activarVistas(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol;
    if(!esAdmin) {
        document.getElementById('mainBody').classList.add('modo-tecnico');
        document.getElementById('colForm').classList.add('hidden');
        document.getElementById('colTabla').className = "col-12";
    }
    escucharDatos();
}

function escucharDatos() {
    db.ref('servicios').on('value', snap => {
        servicios = snap.val() ? Object.entries(snap.val()).map(([id, data]) => ({id, ...data})) : [];
        renderizarTabla();
    });
}

function setFiltro(val) { filtroActual = val; renderizarTabla(); }

function renderizarTabla() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    tbody.innerHTML = '';
    const hoy = new Date().toISOString().split('T')[0];

    servicios.forEach(s => {
        // Corrección de Undefined: buscar en placas o placa
        const placaVisual = s.placas || s.placa || "S/N";
        const fechaS = (s.inicio || "").split('T')[0];
        
        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fechaS !== hoy) pasaFiltro = false;
        if(filtroActual === 'semana') {
            const diff = (new Date(fechaS) - new Date(hoy)) / (1000 * 60 * 60 * 24);
            if(diff < 0 || diff > 7) pasaFiltro = false;
        }

        if(pasaFiltro && (s.tecnico + placaVisual + (s.cliente || "")).toLowerCase().includes(busq)) {
            tbody.innerHTML += `
                <tr>
                    <td><b>${s.tecnico}</b><br><small class="text-muted">${s.ciudad || ''}</small></td>
                    <td><span class="text-placa">${placaVisual}</span><br><small>${s.tarea || ''}</small></td>
                    <td><small>${(s.inicio || "").replace('T', ' ')}</small></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-outline-info btn-sm"><i class="bi bi-eye"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-outline-warning btn-sm"><i class="bi bi-pencil"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button>
                                <a href="https://wa.me/${s.wsp}" target="_blank" class="btn btn-outline-success btn-sm"><i class="bi bi-whatsapp"></i></a>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        }
    });
}

// FORMULARIO Y ACCIONES
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
        asignadoPor: document.getElementById('asignadoPor').value,
        tecnico: document.getElementById('tecnico').value,
        wsp: document.getElementById('wsp').value,
        email: document.getElementById('emailNotif').value,
        cliente: document.getElementById('cliente').value,
        ciudad: document.getElementById('ciudad').value,
        direccion: document.getElementById('direccion').value,
        placas: document.getElementById('placas').value.toUpperCase(),
        equipo: document.getElementById('equipo').value,
        tarea: document.getElementById('tarea').value,
        obs: document.getElementById('obs').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value
    };

    if(id) db.ref('servicios/' + id).update(data);
    else db.ref('servicios').push(data);
    
    this.reset();
    document.getElementById('editId').value = '';
    document.getElementById('btnGuardar').innerText = "SINCRONIZAR AGENDA";
    alert("Datos guardados.");
});

function verDetalles(id) {
    const s = servicios.find(x => x.id === id);
    document.getElementById('detalleContenido').innerHTML = `
        <p><b>Cliente:</b> ${s.cliente || 'N/A'}</p>
        <p><b>Vehículo:</b> ${s.placas || s.placa || 'N/A'}</p>
        <p><b>Técnico:</b> ${s.tecnico}</p>
        <p><b>Tarea:</b> ${s.tarea}</p>
        <p><b>Ubicación:</b> ${s.ciudad} - ${s.direccion || ''}</p>
        <hr>
        <p><b>Observaciones:</b> ${s.obs || 'Sin observaciones'}</p>
        <small class="text-muted">Asignado por: ${s.asignadoPor}</small>
    `;
    new bootstrap.Modal('#modalVer').show();
}

function editar(id) {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('asignadoPor').value = s.asignadoPor || 'Vidal Zambrano';
    document.getElementById('tecnico').value = s.tecnico;
    document.getElementById('wsp').value = s.wsp || '';
    document.getElementById('emailNotif').value = s.email || '';
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('ciudad').value = s.ciudad || '';
    document.getElementById('direccion').value = s.direccion || '';
    document.getElementById('placas').value = s.placas || s.placa || '';
    document.getElementById('equipo').value = s.equipo || 'GPS';
    document.getElementById('tarea').value = s.tarea || 'Instalación';
    document.getElementById('obs').value = s.obs || '';
    document.getElementById('inicio').value = s.inicio || '';
    document.getElementById('fin').value = s.fin || '';
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo(0,0);
}

function eliminar(id) {
    if(confirm("¿Eliminar este servicio?")) db.ref('servicios/' + id).remove();
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AgendaDatatrack");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
}
