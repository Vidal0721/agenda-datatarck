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

// --- AUTH ---
window.login = function() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(() => alert("Acceso denegado"));
};

window.accesoTecnico = function() {
    esAdmin = false;
    activarApp("VISTA TÉCNICO");
};

window.logout = function() { auth.signOut().then(() => location.reload()); };

auth.onAuthStateChanged(user => {
    if (user) {
        esAdmin = true;
        activarApp("DESPACHADOR: " + user.email);
    }
});

function activarApp(rol) {
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

window.setFiltro = function(val) { filtroActual = val; renderizarTabla(); };

window.renderizarTabla = function() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    tbody.innerHTML = '';
    const hoy = new Date().toISOString().split('T')[0];
    
    servicios.forEach(s => {
        // Soporte para campos viejos y nuevos
        const placaVisual = s.placas || s.placa || s.vehiculo || "N/A";
        const fechaS = (s.inicio || s.fecha || "").split('T')[0];
        
        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fechaS !== hoy) pasaFiltro = false;

        if(pasaFiltro && (s.tecnico + placaVisual + (s.cliente || "")).toLowerCase().includes(busq)) {
            const tel = s.wsp ? s.wsp.toString().replace(/\D/g,'') : "";
            
            tbody.innerHTML += `
                <tr>
                    <td><b>${s.tecnico || 'Sin Técnico'}</b><br><small>${s.ciudad || ''}</small></td>
                    <td><span class="text-placa">${placaVisual}</span></td>
                    <td><small>${(s.inicio || s.fecha || "").replace('T', ' ')}</small></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-info btn-sm text-white"><i class="bi bi-eye"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-warning btn-sm text-white"><i class="bi bi-pencil"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>
                                <a href="https://wa.me/${tel}" target="_blank" class="btn btn-success btn-sm ${tel ? '' : 'disabled'}"><i class="bi bi-whatsapp"></i></a>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        }
    });
};

// --- ACCIONES ---
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
        asignadoPor: document.getElementById('asignadoPor').value,
        tecnico: document.getElementById('tecnico').value,
        wsp: document.getElementById('wsp').value,
        emailNotif: document.getElementById('emailNotif').value,
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

    if(id) db.ref('servicios/' + id).set(data); // Usamos .set para estandarizar el registro viejo al nuevo formato
    else db.ref('servicios').push(data);
    
    this.reset();
    document.getElementById('editId').value = '';
    document.getElementById('btnGuardar').innerText = "GUARDAR / ACTUALIZAR";
    alert("Datos sincronizados.");
});

window.verDetalles = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    const p = s.placas || s.placa || s.vehiculo || "N/A";
    document.getElementById('detalleContenido').innerHTML = `
        <p><b>Cliente:</b> ${s.cliente || 'N/A'}</p>
        <p><b>Placas:</b> <span class="text-danger fw-bold">${p}</span></p>
        <p><b>Técnico:</b> ${s.tecnico || 'N/A'}</p>
        <p><b>Tarea:</b> ${s.tarea || 'N/A'}</p>
        <p><b>Ubicación:</b> ${s.ciudad || ''} - ${s.direccion || ''}</p>
        <hr>
        <p><b>Observaciones:</b> ${s.obs || 'Sin observaciones'}</p>
        <p><small><b>Asignado por:</b> ${s.asignadoPor || 'N/A'}</small></p>
    `;
    const m = new bootstrap.Modal(document.getElementById('modalVer'));
    m.show();
};

window.editar = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;

    // Mapeo inteligente de campos viejos a formulario nuevo
    document.getElementById('editId').value = s.id;
    document.getElementById('asignadoPor').value = s.asignadoPor || 'Vidal Zambrano';
    document.getElementById('tecnico').value = s.tecnico || 'Sebastián León';
    document.getElementById('wsp').value = s.wsp || '';
    document.getElementById('emailNotif').value = s.emailNotif || s.email || '';
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('cantPlacas').value = s.cantPlacas || 1;
    document.getElementById('placas').value = s.placas || s.placa || s.vehiculo || '';
    document.getElementById('ciudad').value = s.ciudad || '';
    document.getElementById('direccion').value = s.direccion || '';
    document.getElementById('equipo').value = s.equipo || 'GPS';
    document.getElementById('tarea').value = s.tarea || 'Instalación';
    document.getElementById('inicio').value = s.inicio || s.fecha || '';
    document.getElementById('fin').value = s.fin || '';
    document.getElementById('obs').value = s.obs || '';
    
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR REGISTRO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.eliminar = function(id) {
    if(confirm("¿Borrar servicio definitivamente?")) db.ref('servicios/' + id).remove();
};
