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

// --- CONTROL DE VISTA "OTRO" ---
window.checkOtroTecnico = function(val) {
    const div = document.getElementById('divOtroTecnico');
    val === "OTRO" ? div.classList.remove('hidden') : div.classList.add('hidden');
};

// --- LOGIN Y SEGURIDAD ---
window.login = function() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    if(!email || !pass) return alert("Completa los campos");
    
    auth.signInWithEmailAndPassword(email, pass)
        .catch(err => alert("Error de acceso: " + err.message));
};

window.accesoTecnico = function() { 
    esAdmin = false;
    activarApp("CONSULTA TÉCNICA"); 
};

window.logout = function() { 
    auth.signOut().then(() => location.reload()); 
};

auth.onAuthStateChanged(user => {
    if (user) { 
        esAdmin = true; 
        activarApp("ADMIN: " + user.email.split('@')[0].toUpperCase()); 
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
        for (let id in data) { servicios.push({ id, ...data[id] }); }
        renderizarTabla();
    });
}

window.setFiltro = function(val) { 
    filtroActual = val; 
    renderizarTabla(); 
};

// --- RENDERIZADO DE TABLA (BOTONES CORREGIDOS) ---
window.renderizarTabla = function() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    const hoy = new Date().toISOString().split('T')[0];
    tbody.innerHTML = '';
    
    servicios.forEach(s => {
        // Soporte para datos antiguos (Híbrido)
        const tec = s.tecnico || s.nombreTecnico || "N/A";
        const placa = s.placas || s.placa || s.vehiculo || "---";
        const fecha = (s.inicio || s.fecha || "").split('T')[0];

        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fecha !== hoy) pasaFiltro = false;

        if (pasaFiltro && (tec + placa + (s.cliente || "")).toLowerCase().includes(busq)) {
            const tel = s.wsp ? s.wsp.toString().replace(/\D/g,'') : "";
            
            tbody.innerHTML += `
                <tr>
                    <td>
                        <div class="fw-bold text-dark">${tec}</div>
                        <div class="small text-muted"><i class="bi bi-geo-alt"></i> ${s.ciudad || '---'}</div>
                    </td>
                    <td class="text-center"><span class="text-placa">${placa}</span></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-light border btn-sm"><i class="bi bi-eye text-primary"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-light border btn-sm"><i class="bi bi-pencil text-warning"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-light border btn-sm"><i class="bi bi-trash text-danger"></i></button>
                                <a href="https://wa.me/${tel}" target="_blank" class="btn btn-light border btn-sm ${tel ? '' : 'disabled'}"><i class="bi bi-whatsapp text-success"></i></a>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        }
    });
};

// --- GUARDAR Y ACTUALIZAR ---
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    let tecSel = document.getElementById('tecnico').value;
    if(tecSel === "OTRO") tecSel = document.getElementById('otroTecnicoNombre').value;

    const data = {
        tecnico: tecSel,
        wsp: document.getElementById('wsp').value,
        cliente: document.getElementById('cliente').value,
        placas: document.getElementById('placas').value.toUpperCase(),
        ciudad: document.getElementById('ciudad').value,
        inicio: document.getElementById('inicio').value,
        obs: document.getElementById('obs').value
    };

    if(id) {
        db.ref('servicios/' + id).update(data).then(() => alert("Actualizado"));
    } else {
        db.ref('servicios').push(data).then(() => alert("Guardado"));
    }
    
    this.reset();
    document.getElementById('editId').value = '';
    document.getElementById('divOtroTecnico').classList.add('hidden');
    document.getElementById('btnGuardar').innerText = "GUARDAR REGISTRO";
});

// --- FUNCIONES DE BOTONES (GLOBALES) ---
window.verDetalles = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    const placa = s.placas || s.placa || s.vehiculo || "N/A";
    
    document.getElementById('detalleContenido').innerHTML = `
        <div class="mb-3">
            <label class="form-label d-block">Cliente</label>
            <div class="h6 fw-bold">${s.cliente || 'N/A'}</div>
        </div>
        <div class="row mb-3">
            <div class="col-6">
                <label class="form-label d-block">Vehículo</label>
                <span class="text-placa">${placa}</span>
            </div>
            <div class="col-6">
                <label class="form-label d-block">Técnico</label>
                <div class="fw-bold">${s.tecnico || 'N/A'}</div>
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label d-block">Observaciones</label>
            <div class="p-2 bg-light rounded border small">${s.obs || 'Sin observaciones adicionales'}</div>
        </div>
        <div class="small text-muted border-top pt-2">
            Inicio: ${(s.inicio || s.fecha || '').replace('T', ' ')}
        </div>
    `;
    const m = new bootstrap.Modal(document.getElementById('modalVer'));
    m.show();
};

window.editar = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    
    document.getElementById('editId').value = s.id;
    const lista = ["Sebastián León", "Lord Zambrano", "Wilton Posso", "Orlando Lara", "Nilson Payares"];
    const tecNom = s.tecnico || s.nombreTecnico || "";

    if(lista.includes(tecNom)) {
        document.getElementById('tecnico').value = tecNom;
        document.getElementById('divOtroTecnico').classList.add('hidden');
    } else {
        document.getElementById('tecnico').value = "OTRO";
        document.getElementById('divOtroTecnico').classList.remove('hidden');
        document.getElementById('otroTecnicoNombre').value = tecNom;
    }

    document.getElementById('wsp').value = s.wsp || '';
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('placas').value = s.placas || s.placa || s.vehiculo || '';
    document.getElementById('ciudad').value = s.ciudad || '';
    document.getElementById('inicio').value = s.inicio || s.fecha || '';
    document.getElementById('obs').value = s.obs || '';
    
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR DATOS";
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.eliminar = function(id) {
    if(confirm("¿Estás seguro de eliminar este servicio de Datatrack?")) {
        db.ref('servicios/' + id).remove();
    }
};

window.exportarExcel = function() {
    const dataExcel = servicios.map(s => ({
        Tecnico: s.tecnico || s.nombreTecnico,
        Placa: s.placas || s.placa || s.vehiculo,
        Cliente: s.cliente,
        Ciudad: s.ciudad,
        Fecha: (s.inicio || s.fecha || "").replace('T', ' '),
        Observaciones: s.obs
    }));
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
};
