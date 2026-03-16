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

// --- AUTENTICACIÓN ---
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
        servicios = [];
        const data = snap.val();
        for (let id in data) {
            servicios.push({ id, ...data[id] });
        }
        renderizarTabla();
    });
}

function setFiltro(val) { filtroActual = val; renderizarTabla(); }

// --- RENDERIZADO DE TABLA (CORREGIDO) ---
function renderizarTabla() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    tbody.innerHTML = '';
    const hoy = new Date().toISOString().split('T')[0];
    
    servicios.forEach(s => {
        const placaVisual = s.placas || s.placa || s.vehiculo || "SIN PLACA";
        const fechaS = (s.inicio || "").split('T')[0];
        
        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fechaS !== hoy) pasaFiltro = false;

        if(pasaFiltro && (s.tecnico + placaVisual + (s.cliente || "")).toLowerCase().includes(busq)) {
            // Limpiar el número de WhatsApp (quitar espacios o símbolos si los hay)
            const tel = s.wsp ? s.wsp.replace(/\D/g,'') : "";
            const urlWsp = `https://api.whatsapp.com/send?phone=${tel}`;

            tbody.innerHTML += `
                <tr>
                    <td><b>${s.tecnico}</b><br><small class="text-muted">${s.ciudad || ''}</small></td>
                    <td><span class="text-placa">${placaVisual}</span><br><small>${s.tarea || ''}</small></td>
                    <td><small>${(s.inicio || "").replace('T', ' ')}</small></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-info btn-sm text-white" title="Ver"><i class="bi bi-eye"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-warning btn-sm text-white" title="Editar"><i class="bi bi-pencil"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-danger btn-sm" title="Borrar"><i class="bi bi-trash"></i></button>
                                <a href="${urlWsp}" target="_blank" class="btn btn-success btn-sm" title="WhatsApp"><i class="bi bi-whatsapp"></i></a>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        }
    });
}

// --- ACCIONES DEL FORMULARIO ---
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
        asignadoPor: document.getElementById('asignadoPor').value,
        tecnico: document.getElementById('tecnico').value,
        wsp: document.getElementById('wsp').value,
        email: document.getElementById('emailNotif').value,
        ciudad: document.getElementById('ciudad').value,
        direccion: document.getElementById('direccion').value,
        cliente: document.getElementById('cliente').value,
        cantPlacas: document.getElementById('cantPlacas').value,
        placas: document.getElementById('placas').value.toUpperCase(),
        equipo: document.getElementById('equipo').value,
        tarea: document.getElementById('tarea').value,
        obs: document.getElementById('obs').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value
    };

    if(id) {
        db.ref('servicios/' + id).update(data).then(() => alert("Actualizado"));
    } else {
        db.ref('servicios').push(data).then(() => alert("Guardado"));
    }
    
    this.reset();
    document.getElementById('editId').value = '';
    document.getElementById('btnGuardar').innerText = "GUARDAR";
});

// --- FUNCIONES DE BOTONES (VER Y EDITAR) ---
window.verDetalles = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    const p = s.placas || s.placa || s.vehiculo || "N/A";
    
    document.getElementById('detalleContenido').innerHTML = `
        <div class="p-2">
            <p class="mb-1"><b>Cliente:</b> ${s.cliente || 'N/A'}</p>
            <p class="mb-1"><b>Placas:</b> <span class="text-danger fw-bold">${p}</span></p>
            <p class="mb-1"><b>Técnico:</b> ${s.tecnico}</p>
            <p class="mb-1"><b>Tarea:</b> ${s.tarea}</p>
            <p class="mb-1"><b>Equipo:</b> ${s.equipo}</p>
            <p class="mb-1"><b>Dirección:</b> ${s.direccion || 'N/A'}</p>
            <p class="mb-1"><b>Ciudad:</b> ${s.ciudad || 'N/A'}</p>
            <hr>
            <p class="mb-1"><b>Observaciones:</b> ${s.obs || 'Ninguna'}</p>
            <p class="mb-0 small text-muted">Asignado por: ${s.asignadoPor || 'N/A'}</p>
        </div>
    `;
    const myModal = new bootstrap.Modal(document.getElementById('modalVer'));
    myModal.show();
};

window.editar = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('asignadoPor').value = s.asignadoPor || 'Vidal Zambrano';
    document.getElementById('tecnico').value = s.tecnico;
    document.getElementById('wsp').value = s.wsp || '';
    document.getElementById('emailNotif').value = s.emailNotif || '';
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('cantPlacas').value = s.cantPlacas || 1;
    document.getElementById('placas').value = s.placas || s.placa || '';
    document.getElementById('ciudad').value = s.ciudad || '';
    document.getElementById('direccion').value = s.direccion || '';
    document.getElementById('equipo').value = s.equipo || 'GPS';
    document.getElementById('tarea').value = s.tarea || 'Instalación';
    document.getElementById('inicio').value = s.inicio || '';
    document.getElementById('fin').value = s.fin || '';
    document.getElementById('obs').value = s.obs || '';
    
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.eliminar = function(id) {
    if(confirm("¿Seguro que quieres borrar este registro de Datatrack?")) {
        db.ref('servicios/' + id).remove();
    }
};

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
}
