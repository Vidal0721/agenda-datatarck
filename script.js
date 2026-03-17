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

const CORREOS_ADMIN = ["analista.monitoreo1@datatrack.co", "lider.operaciones@datatrack.co", "analista.operaciones1@datatrack.co"];

let servicios = [];
let tecnicosDB = [];
let esAdmin = false;
let userLogueado = null;
let filtroEstado = 'TODOS';
let primeraCarga = true;

// NOTIFICACIONES DE NAVEGADOR (RESTABLECIDAS)
window.requestNotifyPermission = () => {
    if (!("Notification" in window)) return alert("Este navegador no soporta notificaciones.");
    Notification.requestPermission().then(p => { 
        if(p === "granted") alert("✅ Notificaciones activadas correctamente."); 
    });
};

function dispararNotificacion(tec, placa) {
    const audio = document.getElementById('sndNotif');
    if(audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
    if(Notification.permission === "granted") {
        new Notification("✅ SERVICIO FINALIZADO", { body: `El técnico ${tec} terminó la placa ${placa}` });
    }
    alert(`🔔 AVISO: ${tec} terminó placa ${placa}`);
}

// AUTH
window.login = () => {
    const e = document.getElementById('userEmail').value, p = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Error: " + err.message));
};
window.logout = () => auth.signOut().then(() => location.reload());

auth.onAuthStateChanged(user => {
    if(user) {
        userLogueado = user.email.toLowerCase();
        esAdmin = CORREOS_ADMIN.includes(userLogueado);
        activarApp();
    }
});

function activarApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = (esAdmin ? "ADM: " : "TEC: ") + userLogueado.split('@')[0].toUpperCase();
    
    if(!esAdmin) {
        document.getElementById('mainBody').classList.add('modo-tecnico');
        document.getElementById('colForm').classList.add('hidden');
        document.getElementById('colTabla').className = "col-12";
    }

    db.ref('tecnicos').on('value', snap => {
        tecnicosDB = []; snap.forEach(c => { tecnicosDB.push({id: c.key, ...c.val()}); });
        actualizarSelectTecnicos();
        if(esAdmin) renderListaTecnicos();
    });

    db.ref('servicios').on('value', snap => {
        let nuevos = []; snap.forEach(c => { nuevos.push({id: c.key, ...c.val()}); });
        if(esAdmin && !primeraCarga) {
            nuevos.forEach(ns => {
                const viejo = servicios.find(vs => vs.id === ns.id);
                if(viejo && (viejo.estado === 'PENDIENTE' || !viejo.estado) && ns.estado === 'REALIZADA') {
                    dispararNotificacion(ns.tecnico, ns.placas);
                }
            });
        }
        servicios = nuevos; renderizar(); primeraCarga = false;
    });
}

// GESTIÓN PERSONAL
function actualizarSelectTecnicos() {
    const sel = document.getElementById('tecnico');
    if(!sel) return;
    let html = '<option value="">Seleccione...</option>';
    tecnicosDB.sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(t => { html += `<option value="${t.nombre}">${t.nombre}</option>`; });
    sel.innerHTML = html;
}
window.seleccionarTecnico = (v) => {
    const t = tecnicosDB.find(x => x.nombre === v);
    document.getElementById('telTec').value = t ? t.whatsapp : "";
};
window.abrirGestionTecnicos = () => {
    document.getElementById('formTecnico').reset();
    document.getElementById('editTecId').value = '';
    document.getElementById('btnSaveTec').innerText = "GUARDAR TÉCNICO";
    new bootstrap.Modal(document.getElementById('modalTecnicos')).show();
};
document.getElementById('formTecnico').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editTecId').value;
    const data = { nombre: document.getElementById('tecNombre').value, whatsapp: document.getElementById('tecWhatsApp').value, email: document.getElementById('tecEmail').value };
    if(id) db.ref('tecnicos/'+id).update(data); else db.ref('tecnicos').push(data);
    document.getElementById('formTecnico').reset();
    document.getElementById('editTecId').value = '';
    document.getElementById('btnSaveTec').innerText = "GUARDAR TÉCNICO";
};
window.editarTec = (id) => {
    const t = tecnicosDB.find(x => x.id === id);
    document.getElementById('editTecId').value = t.id;
    document.getElementById('tecNombre').value = t.nombre;
    document.getElementById('tecWhatsApp').value = t.whatsapp;
    document.getElementById('tecEmail').value = t.email;
    document.getElementById('btnSaveTec').innerText = "ACTUALIZAR TÉCNICO";
};
function renderListaTecnicos() {
    const tbody = document.getElementById('listaTecnicosBase');
    tbody.innerHTML = '';
    tecnicosDB.forEach(t => {
        tbody.innerHTML += `<tr><td>${t.nombre}</td><td>${t.whatsapp}</td><td>
            <button onclick="editarTec('${t.id}')" class="btn btn-sm text-warning"><i class="bi bi-pencil"></i></button>
            <button onclick="eliminarTec('${t.id}')" class="btn btn-sm text-danger"><i class="bi bi-trash"></i></button>
        </td></tr>`;
    });
}
window.eliminarTec = (id) => { if(confirm("¿Eliminar?")) db.ref('tecnicos/'+id).remove(); };

// GESTIÓN SERVICIOS
window.editar = (id) => {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = s.tecnico || '';
    seleccionarTecnico(s.tecnico || '');
    document.getElementById('cliente').value = s.cliente || '';
    document.getElementById('direccion').value = s.direccion || '';
    document.getElementById('fechaInicio').value = s.inicio || '';
    document.getElementById('fechaFin').value = s.fin || '';
    document.getElementById('placasTxt').value = s.placas || '';
    document.getElementById('observaciones').value = s.observaciones || '';
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR SERVICIO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('formServicio').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
        tecnico: document.getElementById('tecnico').value, tel: document.getElementById('telTec').value,
        cliente: document.getElementById('cliente').value, direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('fechaInicio').value, fin: document.getElementById('fechaFin').value,
        placas: document.getElementById('placasTxt').value.toUpperCase(),
        observaciones: document.getElementById('observaciones').value,
        estado: id ? (servicios.find(x=>x.id===id).estado || 'PENDIENTE') : 'PENDIENTE'
    };
    if(id) db.ref('servicios/'+id).update(data).then(()=>reset());
    else db.ref('servicios').push(data).then(()=>reset());
};

function renderizar() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('busqueda').value.toLowerCase();
    tbody.innerHTML = '';
    [...servicios].reverse().forEach(s => {
        const est = s.estado || 'PENDIENTE';
        const t_tec = s.tecnico || 'N/A';
        const t_cli = s.cliente || 'N/A';
        const t_pla = s.placas || '---';
        if((filtroEstado==='TODOS'||est===filtroEstado) && (t_tec+t_cli+t_pla).toLowerCase().includes(busq)) {
            const real = est === 'REALIZADA';
            tbody.innerHTML += `<tr>
                <td class="text-start ps-3"><b>${t_tec}</b><br><small>${t_cli}</small></td>
                <td><span class="text-placa">${t_pla}</span></td>
                <td><div class="fw-bold text-primary" style="font-size:11px">${(s.inicio||'').replace('T',' ')}</div><span class="badge ${real?'badge-realizada':'badge-pendiente'}">${est}</span></td>
                <td><div class="btn-group gap-1">
                    <button onclick="verDetalle('${s.id}')" class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></button>
                    ${esAdmin ? `
                        <button onclick="notificarWhatsApp('${s.id}')" class="btn btn-sm btn-wa"><i class="bi bi-whatsapp"></i></button>
                        <button onclick="editar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-pencil text-warning"></i></button>
                        ${real ? `<button onclick="reabrir('${s.id}')" class="btn btn-sm btn-light border" title="Reabrir"><i class="bi bi-arrow-counterclockwise text-info"></i></button>` : ""}
                        <button onclick="eliminar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-trash text-danger"></i></button>` 
                    : ""}
                    ${!real ? `<button onclick="cerrar('${s.id}')" class="btn btn-sm btn-success fw-bold">CERRAR</button>` : ""}
                </div></td></tr>`;
        }
    });
}

function reset() { document.getElementById('formServicio').reset(); document.getElementById('editId').value = ''; document.getElementById('btnGuardar').innerText = "GUARDAR EN AGENDA"; }

window.notificarWhatsApp = (id) => {
    const s = servicios.find(x => x.id === id);
    if (!s) return;

    // Formatear el teléfono
    const telLimpio = (s.tel || '').replace(/\D/g, '');
    const fono = telLimpio.startsWith('57') ? telLimpio : '57' + telLimpio;

    if (fono.length < 10) return alert("⚠️ El técnico no tiene un número válido.");

    // Preparar los datos con codificación segura para URL
    const cliente = encodeURIComponent(s.cliente || 'N/A');
    const placas = encodeURIComponent(s.placas || 'N/A');
    const direccion = encodeURIComponent(s.direccion || 'N/A');
    const inicio = encodeURIComponent((s.inicio || '').replace('T', ' '));
    const fin = encodeURIComponent((s.fin || '').replace('T', ' '));
    const obs = encodeURIComponent(s.observaciones || 'Sin observaciones.');

    // Construcción del mensaje usando los componentes codificados
    const msg = `*DATATRACK - NUEVO SERVICIO*%0A%0A` +
                `*📍 Cliente:* ${cliente}%0A` +
                `*🚗 Placas:* ${placas}%0A` +
                `*🏠 Dirección:* ${direccion}%0A%0A` +
                `*⏰ Inicia:* ${inicio}%0A` +
                `*🏁 Finaliza:* ${fin}%0A%0A` +
                `*📝 Observaciones:* ${obs}`;

    window.open(`https://api.whatsapp.com/send?phone=${fono}&text=${msg}`, '_blank');
};

window.verDetalle = (id) => {
    const s = servicios.find(x=>x.id===id);
    document.getElementById('bodyDetalle').innerHTML = `<p><strong>Dirección:</strong> ${s.direccion||'N/A'}</p><p><strong>Obs:</strong> ${s.observaciones||'N/A'}</p><hr><small>Cerrado por: ${s.cerradoPor||'Pendiente'}</small>`;
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
};
window.cerrar = (id) => { if(confirm("¿Cerrar servicio?")) db.ref('servicios/'+id).update({ estado: 'REALIZADA', cerradoPor: userLogueado }); };
window.reabrir = (id) => { if(confirm("¿Deseas volver a poner este servicio como PENDIENTE?")) db.ref('servicios/'+id).update({ estado: 'PENDIENTE', cerradoPor: null }); };
window.eliminar = (id) => { if(confirm("¿Borrar permanentemente?")) db.ref('servicios/'+id).remove(); };
window.setFiltro = (f) => { 
    filtroEstado = f; 
    document.querySelectorAll('.btn-filter').forEach(b=>b.classList.remove('active')); 
    if(f==='TODOS') document.getElementById('btnFiltroTodos').classList.add('active');
    if(f==='PENDIENTE') document.getElementById('btnFiltroPend').classList.add('active');
    if(f==='REALIZADA') document.getElementById('btnFiltroReal').classList.add('active');
    renderizar(); 
};
window.exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Reporte_Datatrack.xlsx");
};
