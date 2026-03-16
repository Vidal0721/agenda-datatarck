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

// --- GESTIÓN TÉCNICO "OTRO" ---
window.checkOtroTecnico = function(val) {
    const div = document.getElementById('divOtroTecnico');
    val === "OTRO" ? div.classList.remove('hidden') : div.classList.add('hidden');
};

// --- AUTH ---
window.login = function() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(() => alert("Error de acceso"));
};

window.accesoTecnico = function() { activarApp("VISTA TÉCNICO"); };
window.logout = function() { auth.signOut().then(() => location.reload()); };

auth.onAuthStateChanged(user => {
    if (user) { esAdmin = true; activarApp("DESPACHADOR: " + user.email); }
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

window.setFiltro = function(val) { filtroActual = val; renderizarTabla(); };

// --- RENDERIZADO CON SOPORTE HÍBRIDO ---
window.renderizarTabla = function() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    const hoy = new Date().toISOString().split('T')[0];
    tbody.innerHTML = '';
    
    servicios.forEach(s => {
        const tecnico = s.tecnico || s.nombreTecnico || "N/A";
        const placa = s.placas || s.placa || s.vehiculo || "---";
        const fecha = (s.inicio || s.fecha || "").split('T')[0];
        const cliente = s.cliente || "";

        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fecha !== hoy) pasaFiltro = false;

        if (pasaFiltro && (tecnico + placa + cliente).toLowerCase().includes(busq)) {
            const tel = s.wsp ? s.wsp.toString().replace(/\D/g,'') : "";
            
            tbody.innerHTML += `
                <tr>
                    <td><b>${tecnico}</b><br><small class="text-muted">${s.ciudad || ''}</small></td>
                    <td class="text-center"><span class="text-placa">${placa}</span></td>
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
    let tec = document.getElementById('tecnico').value;
    if(tec === "OTRO") tec = document.getElementById('otroTecnicoNombre').value;

    const data = {
        tecnico: tec,
        wsp: document.getElementById('wsp').value,
        cliente: document.getElementById('cliente').value,
        placas: document.getElementById('placas').value.toUpperCase(),
        ciudad: document.getElementById('ciudad').value,
        inicio: document.getElementById('inicio').value,
        obs: document.getElementById('obs').value,
        fechaRegistro: new Date().toLocaleString()
    };

    if(id) db.ref('servicios/' + id).update(data);
    else db.ref('servicios').push(data);
    
    this.reset();
    document.getElementById('editId').value = '';
    document.getElementById('divOtroTecnico').classList.add('hidden');
    document.getElementById('btnGuardar').innerText = "GUARDAR";
});

window.verDetalles = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    document.getElementById('detalleContenido').innerHTML = `
        <p class="mb-1"><b>Cliente:</b> ${s.cliente || 'N/A'}</p>
        <p class="mb-1"><b>Vehículo:</b> ${s.placas || s.placa || s.vehiculo || 'N/A'}</p>
        <p class="mb-1"><b>Técnico:</b> ${s.tecnico || s.nombreTecnico || 'N/A'}</p>
        <p class="mb-1"><b>Fecha:</b> ${(s.inicio || s.fecha || '').replace('T',' ')}</p>
        <hr>
        <p class="mb-0"><b>Obs:</b> ${s.obs || 'Sin observaciones'}</p>
    `;
    new bootstrap.Modal(document.getElementById('modalVer')).show();
};

window.editar = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    document.getElementById('editId').value = s.id;
    
    const lista = ["Sebastián León", "Lord Zambrano", "Wilton Posso", "Orlando Lara", "Nilson Payares"];
    const tec = s.tecnico || s.nombreTecnico || "";
    
    if(lista.includes(tec)) {
        document.getElementById('tecnico').value = tec;
        document.getElementById('divOtroTecnico').classList.add('hidden');
    } else {
        document.getElementById('tecnico').value = "OTRO";
        document.getElementById('divOtroTecnico').classList.remove('hidden');
        document.getElementById('otroTecnicoNombre').value = tec;
    }

    document.getElementById('wsp').value = s.wsp || '';
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('placas').value = s.placas || s.placa || s.vehiculo || '';
    document.getElementById('ciudad').value = s.ciudad || '';
    document.getElementById('inicio').value = s.inicio || s.fecha || '';
    document.getElementById('obs').value = s.obs || '';
    
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR";
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.eliminar = function(id) {
    if(confirm("¿Eliminar registro?")) db.ref('servicios/' + id).remove();
};

window.exportarExcel = function() {
    const dataExcel = servicios.map(s => ({
        Tecnico: s.tecnico || s.nombreTecnico,
        Placa: s.placas || s.placa || s.vehiculo,
        Cliente: s.cliente,
        Fecha: s.inicio || s.fecha,
        Ciudad: s.ciudad,
        Observaciones: s.obs
    }));
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
};
