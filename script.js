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
let filtroEstado = 'TODOS';

const STAFF = {
    "Sebastián León": { mail: "tecnico1@datatrack.co", tel: "573135307403" },
    "Orlando Lara": { mail: "tecnico2@datatrack.co", tel: "573135307403" },
    "Lord Zambrano": { mail: "lord.tecnico3@datatrack.co", tel: "573135307403" },
    "Wilton Posso": { mail: "tecnico4@datatrack.co", tel: "573135307403" }
};

window.setFiltro = (estado) => {
    filtroEstado = estado;
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    if(estado === 'TODOS') document.getElementById('btnFiltroTodos').classList.add('active');
    if(estado === 'PENDIENTE') document.getElementById('btnFiltroPend').classList.add('active');
    if(estado === 'REALIZADA') document.getElementById('btnFiltroReal').classList.add('active');
    renderizar();
};

window.seleccionarTecnico = (v) => {
    const dO = document.getElementById('divOtro'), t = document.getElementById('telTec'), m = document.getElementById('emailTec');
    if(v === "OTRO") { dO.classList.remove('hidden'); if(t) t.value = ""; if(m) m.value = ""; }
    else if(STAFF[v]) { dO.classList.add('hidden'); if(t) t.value = STAFF[v].tel; if(m) m.value = STAFF[v].mail; }
};

window.login = () => {
    const e = document.getElementById('userEmail').value, p = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Error de acceso"));
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
    document.getElementById('txtRol').innerText = (esAdmin ? "ADM: " : "TEC: ") + userLogueado.split('@')[0];
    if(!esAdmin) {
        document.getElementById('mainBody').classList.add('modo-tecnico');
        document.getElementById('colForm').classList.add('hidden');
        document.getElementById('colTabla').className = "col-12";
    }
    db.ref('servicios').on('value', snap => {
        servicios = []; snap.forEach(c => { servicios.push({id: c.key, ...c.val()}); });
        renderizar();
    });
}

function renderizar() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('busqueda').value.toLowerCase();
    tbody.innerHTML = '';
    
    [...servicios].reverse().forEach(s => {
        const est = s.estado || 'PENDIENTE';
        const fI = (s.inicio || "").split('T')[0] || "---";
        const hI = (s.inicio || "").split('T')[1] || "00:00";
        const hF = (s.fin || "").split('T')[1] || "00:00";
        const real = est === 'REALIZADA';

        const cumpleFiltro = (filtroEstado === 'TODOS' || est === filtroEstado);
        const cumpleBusq = (s.tecnico + s.cliente + (s.placas||'')).toLowerCase().includes(busq);

        if(cumpleFiltro && cumpleBusq) {
            tbody.innerHTML += `
                <tr>
                    <td class="text-start ps-3">
                        <b>${s.tecnico}</b><br>
                        <small class="text-muted">${s.cliente}</small>
                        <span class="obs-text" title="${s.observaciones || ''}">${s.observaciones ? '📝 ' + s.observaciones : ''}</span>
                    </td>
                    <td><span class="text-placa">${s.placas || '---'}</span></td>
                    <td>
                        <div class="fw-bold text-primary" style="font-size:11px">${fI}</div>
                        <div class="small text-muted">${hI} a ${hF}</div>
                        <span class="badge ${real ? 'badge-realizada':'badge-pendiente'}" style="font-size:9px">${est}</span>
                    </td>
                    <td>
                        <div class="btn-group gap-1">
                            <button onclick="verDetalle('${s.id}')" class="btn btn-sm btn-outline-primary border" title="Ver"><i class="bi bi-eye"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-pencil text-warning"></i></button>
                                ${real ? `<button onclick="reabrir('${s.id}')" class="btn btn-sm btn-light border" title="Reabrir"><i class="bi bi-arrow-counterclockwise text-info"></i></button>` : ""}
                                <button onclick="eliminar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-trash text-danger"></i></button>
                            ` : ""}
                            ${!real ? `<button onclick="cerrar('${s.id}')" class="btn btn-sm btn-success fw-bold px-2">CERRAR</button>` : ""}
                        </div>
                    </td>
                </tr>`;
        }
    });
}

document.getElementById('formServicio').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    let tec = document.getElementById('tecnico').value;
    if(tec === "OTRO") tec = document.getElementById('otroNombre').value;

    const data = {
        tecnico: tec, cliente: document.getElementById('cliente').value,
        direccion: document.getElementById('direccion').value || "",
        inicio: document.getElementById('fechaInicio').value, fin: document.getElementById('fechaFin').value,
        placas: document.getElementById('placasTxt').value.toUpperCase(), 
        observaciones: document.getElementById('observaciones').value || "",
        estado: 'PENDIENTE', timestamp: Date.now()
    };

    if(id) db.ref('servicios/' + id).update(data).then(() => { alert("Actualizado"); reset(); });
    else db.ref('servicios').push(data).then(() => { alert("Guardado"); reset(); });
};

function reset() { document.getElementById('formServicio').reset(); document.getElementById('editId').value = ''; document.getElementById('btnGuardar').innerText = "GUARDAR ASIGNACIÓN"; }

window.verDetalle = (id) => {
    const s = servicios.find(x => x.id === id);
    document.getElementById('bodyDetalle').innerHTML = `
        <div class="p-2">
            <p><strong>Cliente:</strong> ${s.cliente}</p>
            <p class="text-primary"><strong>Dirección:</strong> ${s.direccion || 'No registrada'}</p>
            <p><strong>Placas:</strong> ${s.placas || '---'}</p>
            <p><strong>Observaciones:</strong><br><span class="text-muted">${s.observaciones || 'Sin notas'}</span></p>
            <hr>
            <small class="text-muted">Estado: ${s.estado || 'PENDIENTE'}</small>
        </div>`;
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
};

window.reabrir = (id) => { if(confirm("¿Reabrir este servicio?")) db.ref('servicios/' + id).update({ estado: 'PENDIENTE', cerradoPor: null, fechaCierre: null }); };

window.cerrar = (id) => { if(confirm("¿Finalizar servicio?")) db.ref('servicios/' + id).update({ estado: 'REALIZADA', cerradoPor: userLogueado, fechaCierre: new Date().toLocaleString('es-CO') }); };

window.editar = (id) => {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = STAFF[s.tecnico] ? s.tecnico : "OTRO";
    seleccionarTecnico(document.getElementById('tecnico').value);
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('direccion').value = s.direccion || "";
    document.getElementById('fechaInicio').value = s.inicio;
    document.getElementById('fechaFin').value = s.fin;
    document.getElementById('placasTxt').value = s.placas;
    document.getElementById('observaciones').value = s.observaciones || "";
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR DATOS";
    window.scrollTo(0,0);
};

window.eliminar = (id) => { if(confirm("¿Borrar?")) db.ref('servicios/' + id).remove(); };

window.exportarExcel = () => {
    const formatted = servicios.map(s => ({
        Fecha: (s.inicio||'').split('T')[0],
        Tecnico: s.tecnico,
        Cliente: s.cliente,
        Placas: s.placas,
        Observaciones: s.observaciones
    }));
    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
};
