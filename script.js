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
const db = firebase.database();
const auth = firebase.auth();

let servicios = [];
let esAdmin = false;
let userLogueado = null;
let filtroActual = 'todos';

// --- DATOS MAESTROS TÉCNICOS ---
const STAFF = {
    "Sebastián León": { mail: "tecnico1@datatrack.co", tel: "573135307403" },
    "Orlando Lara": { mail: "tecnico2@datatrack.co", tel: "573135307403" },
    "Lord Zambrano": { mail: "lord.tecnico3@datatrack.co", tel: "573135307403" }
};

window.seleccionarTecnico = function(val) {
    const divOtro = document.getElementById('divOtro');
    const telInp = document.getElementById('telTec');
    const mailInp = document.getElementById('emailTec');

    if(val === "OTRO") {
        divOtro.classList.remove('hidden');
        telInp.value = ""; mailInp.value = "";
    } else {
        divOtro.classList.add('hidden');
        if(STAFF[val]) {
            telInp.value = STAFF[val].tel;
            mailInp.value = STAFF[val].mail;
        }
    }
};

window.generarInputsPlacas = function(cant) {
    const cont = document.getElementById('contenedorPlacas');
    cont.innerHTML = '';
    for(let i=0; i<cant; i++) {
        cont.innerHTML += `<input type="text" class="form-control form-control-sm input-placa mb-1" placeholder="Placa ${i+1}" style="width: 100px; text-transform:uppercase">`;
    }
};

// --- AUTENTICACIÓN ---
window.login = function() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(() => alert("Credenciales incorrectas"));
};

window.accesoTecnico = function() {
    activarApp("INVITADO");
};

window.logout = function() { auth.signOut().then(() => location.reload()); };

auth.onAuthStateChanged(user => {
    if(user) {
        userLogueado = user.email;
        // Si el correo no tiene la palabra "tecnico", asumimos que es Vidal o Deivis (Admin)
        esAdmin = !user.email.toLowerCase().includes('tecnico');
        activarApp(esAdmin ? "DESPACHADOR" : "TÉCNICO");
    }
});

function activarApp(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol + (userLogueado ? ": " + userLogueado.split('@')[0] : "");
    
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
        snap.forEach(child => { 
            servicios.push({ id: child.key, ...child.val() }); 
        });
        renderizarTabla();
    });
}

window.setFiltro = function(f) { filtroActual = f; renderizarTabla(); };

window.renderizarTabla = function() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    const hoy = new Date().toISOString().split('T')[0];
    tbody.innerHTML = '';

    servicios.reverse().forEach(s => {
        const tec = s.tecnico || "N/A";
        const cli = s.cliente || "N/A";
        const pla = s.placas || "POR DEFINIR";
        const est = s.estado || "PENDIENTE";
        const fec = (s.fecha || "").split('T')[0];

        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fec !== hoy) pasaFiltro = false;

        if(pasaFiltro && (tec + cli + pla).toLowerCase().includes(busq)) {
            const badge = est === 'REALIZADA' ? 'badge-realizado' : 'badge-pendiente';
            
            tbody.innerHTML += `
                <tr>
                    <td><b>${tec}</b><br><small class="text-muted">${cli}</small></td>
                    <td class="text-center"><span class="text-placa">${pla}</span></td>
                    <td class="text-center"><span class="badge ${badge}">${est}</span></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-light border btn-sm" title="Detalles"><i class="bi bi-eye text-primary"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-light border btn-sm"><i class="bi bi-pencil text-warning"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-light border btn-sm"><i class="bi bi-trash text-danger"></i></button>
                            ` : `
                                ${est === 'PENDIENTE' && userLogueado ? 
                                    `<button onclick="cerrarServicio('${s.id}')" class="btn btn-success btn-sm fw-bold">Cerrar</button>` : 
                                    `<button class="btn btn-secondary btn-sm" disabled>${est === 'REALIZADA' ? 'Listo' : 'Lectura'}</button>`
                                }
                            `}
                        </div>
                    </td>
                </tr>`;
        }
    });
};

// --- ACCIONES CRUD ---
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const placasInp = Array.from(document.querySelectorAll('.input-placa')).map(i => i.value.trim().toUpperCase()).filter(v => v !== "");
    
    let nombreTec = document.getElementById('tecnico').value;
    if(nombreTec === "OTRO") nombreTec = document.getElementById('otroNombre').value;

    const data = {
        despachador: document.getElementById('despachador').value,
        tecnico: nombreTec,
        tel: document.getElementById('telTec').value,
        mail: document.getElementById('emailTec').value,
        cliente: document.getElementById('cliente').value,
        direccion: document.getElementById('direccion').value,
        cantPlacas: document.getElementById('cantPlacas').value,
        placas: placasInp.length > 0 ? placasInp.join(', ') : 'POR DEFINIR',
        fecha: document.getElementById('fechaServ').value,
        obs: document.getElementById('obs').value,
        estado: 'PENDIENTE',
        timestamp: Date.now()
    };

    if(id) db.ref('servicios/' + id).update(data);
    else db.ref('servicios').push(data);
    
    this.reset();
    document.getElementById('editId').value = '';
    document.getElementById('contenedorPlacas').innerHTML = '<input type="text" class="form-control form-control-sm input-placa" placeholder="Por definir" style="width: 100px;">';
});

window.cerrarServicio = function(id) {
    if(!userLogueado) return;
    if(confirm("¿Confirmas la realización de este servicio? Se registrará tu usuario como responsable.")) {
        const firma = {
            estado: 'REALIZADA',
            cerradoPor: userLogueado,
            fechaCierre: new Date().toLocaleString()
        };
        db.ref('servicios/' + id).update(firma).then(() => {
            alert("Servicio finalizado con éxito.");
        });
    }
};

window.verDetalles = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    document.getElementById('detalleContenido').innerHTML = `
        <div class="row g-3">
            <div class="col-6"><small class="form-label d-block">Cliente</small><strong>${s.cliente}</strong></div>
            <div class="col-6"><small class="form-label d-block">Estado</small><span class="badge ${s.estado==='REALIZADA'?'bg-success':'bg-warning text-dark'}">${s.estado}</span></div>
            <div class="col-12"><small class="form-label d-block">Vehículos</small><span class="text-placa">${s.placas}</span></div>
            <div class="col-12"><small class="form-label d-block">Técnico Asignado</small><strong>${s.tecnico}</strong> <br> <small>${s.mail} | ${s.tel}</small></div>
            <div class="col-12"><small class="form-label d-block">Dirección</small><span>${s.direccion || 'No especificada'}</span></div>
            <div class="col-12 border-top pt-2"><small class="form-label d-block">Observaciones</small><p class="small text-muted">${s.obs || 'Sin notas'}</p></div>
            ${s.cerradoPor ? `
                <div class="col-12 bg-light p-2 rounded border">
                    <small class="text-success fw-bold">INFO DE CIERRE:</small><br>
                    <small>Realizado por: ${s.cerradoPor}</small><br>
                    <small>Fecha: ${s.fechaCierre}</small>
                </div>
            ` : ''}
        </div>
    `;
    new bootstrap.Modal(document.getElementById('modalVer')).show();
};

window.editar = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('despachador').value = s.despachador;
    
    if(STAFF[s.tecnico]) {
        document.getElementById('tecnico').value = s.tecnico;
        document.getElementById('divOtro').classList.add('hidden');
    } else {
        document.getElementById('tecnico').value = "OTRO";
        document.getElementById('divOtro').classList.remove('hidden');
        document.getElementById('otroNombre').value = s.tecnico;
    }

    document.getElementById('telTec').value = s.tel || '';
    document.getElementById('emailTec').value = s.mail || '';
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('direccion').value = s.direccion || '';
    document.getElementById('cantPlacas').value = s.cantPlacas || 1;
    document.getElementById('fechaServ').value = s.fecha || '';
    document.getElementById('obs').value = s.obs || '';
    
    // Reconstruir inputs de placas
    const lista = (s.placas || "").split(', ');
    const cont = document.getElementById('contenedorPlacas');
    cont.innerHTML = '';
    lista.forEach(p => {
        cont.innerHTML += `<input type="text" class="form-control form-control-sm input-placa mb-1" value="${p==='POR DEFINIR'?'':p}" style="width: 100px; text-transform:uppercase">`;
    });

    document.getElementById('btnGuardar').innerText = "ACTUALIZAR ASIGNACIÓN";
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.eliminar = function(id) {
    if(confirm("¿Seguro que deseas eliminar este registro de Datatrack?")) db.ref('servicios/' + id).remove();
};

window.exportarExcel = function() {
    const reporte = servicios.map(s => ({
        "Estado": s.estado,
        "Técnico": s.tecnico,
        "Cliente": s.cliente,
        "Placas": s.placas,
        "Dirección": s.direccion,
        "Fecha Programada": s.fecha,
        "Cerrado Por": s.cerradoPor || 'Pendiente',
        "Fecha Realización": s.fechaCierre || 'N/A',
        "Despachador": s.despachador
    }));
    const ws = XLSX.utils.json_to_sheet(reporte);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Reporte_Agenda_Datatrack.xlsx");
};
