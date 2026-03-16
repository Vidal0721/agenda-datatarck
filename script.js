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

const STAFF = {
    "Sebastián León": { mail: "tecnico1@datatrack.co", tel: "573135307403" },
    "Orlando Lara": { mail: "tecnico2@datatrack.co", tel: "573135307403" },
    "Lord Zambrano": { mail: "lord.tecnico3@datatrack.co", tel: "573135307403" },
    "Wilton Posso": { mail: "tecnico4@datatrack.co", tel: "573135307403" }
};

window.seleccionarTecnico = (v) => {
    const dO = document.getElementById('divOtro');
    const t = document.getElementById('telTec');
    const m = document.getElementById('emailTec');
    if(v === "OTRO") { dO.classList.remove('hidden'); t.value = ""; m.value = ""; t.readOnly = false; m.readOnly = false; }
    else { dO.classList.add('hidden'); t.value = STAFF[v]?.tel || ""; m.value = STAFF[v]?.mail || ""; t.readOnly = true; m.readOnly = true; }
};

window.login = () => {
    const e = document.getElementById('userEmail').value;
    const p = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Error: " + err.message));
};

window.logout = () => auth.signOut().then(() => location.reload());

auth.onAuthStateChanged(user => {
    if(user) {
        userLogueado = user.email;
        esAdmin = !user.email.toLowerCase().includes('tecnico');
        activarApp();
    }
});

function activarApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = (esAdmin ? "ADM: " : "TEC: ") + (userLogueado ? userLogueado.split('@')[0] : "Invitado");
    
    if(!esAdmin) {
        document.getElementById('mainBody').classList.add('modo-tecnico');
        document.getElementById('colForm').classList.add('hidden');
        document.getElementById('colTabla').className = "col-12";
    }
    
    db.ref('servicios').on('value', snap => {
        servicios = [];
        snap.forEach(c => { servicios.push({id: c.key, ...c.val()}); });
        renderizar();
    });
}

function renderizar() {
    const tbody = document.getElementById('tablaServicios');
    tbody.innerHTML = '';
    
    [...servicios].reverse().forEach(s => {
        // CORRECCIÓN: Si el estado no existe, poner PENDIENTE por defecto
        const estadoActual = s.estado || 'PENDIENTE';
        const esRealizada = estadoActual === 'REALIZADA';
        
        const hI = (s.inicio || "").split('T')[1] || "00:00";
        const hF = (s.fin || "").split('T')[1] || "00:00";

        tbody.innerHTML += `
            <tr>
                <td><b>${s.tecnico}</b><br><small class="text-muted">${s.cliente}</small></td>
                <td><span class="text-placa">${s.placas || '---'}</span></td>
                <td><small>${hI} - ${hF}</small><br><span class="badge ${esRealizada ? 'badge-realizada':'badge-pendiente'}">${estadoActual}</span></td>
                <td>
                    <div class="btn-group">
                        ${esAdmin ? `
                            <button onclick="editar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-pencil text-warning"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-trash text-danger"></i></button>
                        ` : ""}
                        
                        ${!esRealizada ? `
                            <button onclick="cerrar('${s.id}')" class="btn btn-sm btn-success px-3 fw-bold">CERRAR</button>
                        ` : `
                            <span class="text-success small"><i class="bi bi-check-all"></i> OK</span>
                        `}
                    </div>
                </td>
            </tr>`;
    });
}

document.getElementById('formServicio').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    let tec = document.getElementById('tecnico').value;
    if(tec === "OTRO") tec = document.getElementById('otroNombre').value;

    const data = {
        tecnico: tec,
        tel: document.getElementById('telTec').value,
        mail: document.getElementById('emailTec').value,
        cliente: document.getElementById('cliente').value,
        inicio: document.getElementById('fechaInicio').value,
        fin: document.getElementById('fechaFin').value,
        placas: document.getElementById('placasTxt').value.toUpperCase() || "POR DEFINIR",
        estado: 'PENDIENTE',
        timestamp: Date.now()
    };

    if(id) db.ref('servicios/' + id).update(data).then(() => { alert("Actualizado"); reset(); });
    else db.ref('servicios').push(data).then(() => { alert("Guardado"); reset(); });
};

function reset() { document.getElementById('formServicio').reset(); document.getElementById('editId').value = ''; }

window.cerrar = (id) => {
    if(confirm("¿Confirmas la finalización de este servicio?")) {
        db.ref('servicios/' + id).update({ 
            estado: 'REALIZADA', 
            cerradoPor: userLogueado, 
            fechaCierre: new Date().toLocaleString('es-CO') 
        }).then(() => alert("Servicio Cerrado con Éxito"));
    }
};

window.editar = (id) => {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = STAFF[s.tecnico] ? s.tecnico : "OTRO";
    seleccionarTecnico(document.getElementById('tecnico').value);
    if(document.getElementById('tecnico').value === "OTRO") document.getElementById('otroNombre').value = s.tecnico;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('fechaInicio').value = s.inicio || "";
    document.getElementById('fechaFin').value = s.fin || "";
    document.getElementById('placasTxt').value = s.placas || "";
};

window.eliminar = (id) => { if(confirm("¿Borrar permanentemente?")) db.ref('servicios/' + id).remove(); };

window.exportarExcel = () => {
    const datosExcel = servicios.map(s => ({
        Tecnico: s.tecnico,
        Cliente: s.cliente,
        Placas: s.placas,
        Estado: s.estado || 'PENDIENTE',
        Cerrado_Por: s.cerradoPor || 'N/A',
        Fecha_Cierre: s.fechaCierre || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, "Reporte_Datatrack.xlsx");
};
