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

// AUTH
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
    
    const ahora = new Date();
    const hoyStr = ahora.toISOString().split('T')[0];
    
    servicios.forEach(s => {
        // SOLUCIÓN AL "UNDEFINED" DE PLACAS
        const placaVisual = s.placas || s.placa || s.vehiculo || "SIN PLACA";
        const fechaS = (s.inicio || "").split('T')[0];
        
        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fechaS !== hoyStr) pasaFiltro = false;
        if(filtroActual === 'ayer') {
            const ayer = new Date(); ayer.setDate(ahora.getDate() - 1);
            if(fechaS !== ayer.toISOString().split('T')[0]) pasaFiltro = false;
        }

        if(pasaFiltro && (s.tecnico + placaVisual + (s.cliente || "")).toLowerCase().includes(busq)) {
            tbody.innerHTML += `
                <tr>
                    <td><b>${s.tecnico}</b><br><small class="text-muted">${s.ciudad || ''}</small></td>
                    <td><span class="text-placa">${placaVisual}</span><br><small class="text-secondary">${s.equipo || ''}</small></td>
                    <td><small>${(s.inicio || "").replace('T', ' ')}</small></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-outline-info btn-sm"><i class="bi bi-eye"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-warning btn-sm text-white"><i class="bi bi-pencil"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>
                                <a href="https://wa.me/${s.wsp}" target="_blank" class="btn btn-success btn-sm"><i class="bi bi-whatsapp"></i></a>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        }
    });
}

// ACCIONES
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

    if(id) db.ref('servicios/' + id).update(data);
    else db.ref('servicios').push(data);
    
    this.reset();
    document.getElementById('editId').value = '';
    alert("Datos sincronizados.");
});

function verDetalles(id) {
    const s = servicios.find(x => x.id === id);
    document.getElementById('detalleContenido').innerHTML = `
        <p><b>Cliente:</b> ${s.cliente || 'N/A'}</p>
        <p><b>Placas:</b> ${s.placas || s.placa || 'N/A'}</p>
        <p><b>Cant:</b> ${s.cantPlacas || 1}</p>
        <p><b>Técnico:</b> ${s.tecnico}</p>
        <p><b>Tarea:</b> ${s.tarea}</p>
        <p><b>Dirección:</b> ${s.direccion || ''}</p>
        <hr>
        <p><b>Observaciones:</b> ${s.obs || 'N/A'}</p>
    `;
    new bootstrap.Modal('#modalVer').show();
}

function editar(id) {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = s.tecnico;
    document.getElementById('placas').value = s.placas || s.placa || '';
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('wsp').value = s.wsp || '';
    document.getElementById('ciudad').value = s.ciudad || '';
    document.getElementById('direccion').value = s.direccion || '';
    document.getElementById('equipo').value = s.equipo || 'GPS';
    document.getElementById('tarea').value = s.tarea || 'Instalación';
    document.getElementById('inicio').value = s.inicio || '';
    document.getElementById('obs').value = s.obs || '';
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR";
    window.scrollTo(0,0);
}

function eliminar(id) {
    if(confirm("¿Borrar este servicio?")) db.ref('servicios/' + id).remove();
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
}
