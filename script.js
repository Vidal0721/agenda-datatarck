// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAjh_N7X4nBi6GPnWjexgPX2SKZf7PxW-w",
  authDomain: "agenda-datatrack.firebaseapp.com",
  projectId: "agenda-datatrack",
  storageBucket: "agenda-datatrack.firebasestorage.app",
  messagingSenderId: "818633255134",
  appId: "1:818633255134:web:f0d7dfe7f5caf8c4607a4f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const tecnicosDB = {
    "Lord Zambrano": { tel: "573045846852", mail: "lord.zambrano@datatrack.co" },
    "Orlando Lara": { tel: "573123476734", mail: "tecnico2@datatrack.co" },
    "Sebastián León": { tel: "573233669570", mail: "tecnico1@datatrack.co" },
    "Wilton Posso": { tel: "573004501234", mail: "w.posso@datatrack.co" }
};

let servicios = [];
let filtroTiempoActual = 'todos';

function cargarDatosTecnico() {
    const t = document.getElementById('tecnicoSelect').value;
    const inputO = document.getElementById('otroTecnico');
    if (t === "Otro") { inputO.classList.remove('d-none'); } 
    else {
        inputO.classList.add('d-none');
        if (tecnicosDB[t]) {
            document.getElementById('telTecnico').value = tecnicosDB[t].tel;
            document.getElementById('emailTecnico').value = tecnicosDB[t].mail;
        }
    }
}

function generarCamposPlacas() {
    const cant = parseInt(document.getElementById('cantPlacas').value) || 1;
    const container = document.getElementById('contenedorPlacas');
    const actuales = Array.from(document.querySelectorAll('.placa-input')).map(i => i.value);
    container.innerHTML = '';
    for (let i = 0; i < cant; i++) {
        container.innerHTML += `<div class="col-md-6 mb-2"><input type="text" class="form-control placa-input" placeholder="PLACA ${i+1}" value="${actuales[i] || ''}"></div>`;
    }
}

function toggleOtro(s, i) { document.getElementById(i).classList.toggle('d-none', document.getElementById(s).value !== 'OTRO'); }

// FILTROS DE TIEMPO (Lógica Restaurada)
function setFiltroTiempo(f) { filtroTiempoActual = f; renderizarTabla(); }

function cumpleFiltroTiempo(fechaISO) {
    if (filtroTiempoActual === 'todos') return true;
    const fechaS = new Date(fechaISO);
    const ahora = new Date();
    const hoyStr = ahora.toLocaleDateString('en-CA');
    
    if (filtroTiempoActual === 'hoy') return fechaISO.startsWith(hoyStr);
    
    if (filtroTiempoActual === 'ayer') {
        const ayer = new Date(); ayer.setDate(ahora.getDate() - 1);
        return fechaISO.startsWith(ayer.toLocaleDateString('en-CA'));
    }
    
    if (filtroTiempoActual === 'semana') {
        const proxSemana = new Date(); proxSemana.setDate(ahora.getDate() + 7);
        return fechaS >= ahora && fechaS <= proxSemana;
    }

    if (filtroTiempoActual === 'mes') {
        return fechaS.getMonth() === ahora.getMonth() && fechaS.getFullYear() === ahora.getFullYear();
    }
    return true;
}

// GUARDAR
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const pArray = Array.from(document.querySelectorAll('.placa-input')).map(i => i.value.trim().toUpperCase() || "DESCONOCIDA");
    
    const obj = {
        id: editId ? parseInt(editId) : Date.now(),
        tecnico: document.getElementById('tecnicoSelect').value === 'Otro' ? document.getElementById('otroTecnico').value : document.getElementById('tecnicoSelect').value,
        whatsapp: document.getElementById('telTecnico').value,
        email: document.getElementById('emailTecnico').value,
        despachador: document.getElementById('despachador').value,
        cliente: document.getElementById('cliente').value,
        placa: pArray.join(", "),
        equipo: document.getElementById('equipo').value === 'OTRO' ? document.getElementById('otroEquipo').value : document.getElementById('equipo').value,
        descripcion: document.getElementById('descripcion').value === 'OTRO' ? document.getElementById('otraTarea').value : document.getElementById('descripcion').value,
        observaciones: document.getElementById('observaciones').value || "Ninguna",
        ubicacion: document.getElementById('ubicacion').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value,
        cantVehiculos: pArray.length
    };

    db.ref('servicios/' + obj.id).set(obj).then(() => {
        if(editId) cancelarEdicion();
        this.reset();
        document.getElementById('cantPlacas').value = 1;
        generarCamposPlacas();
    });
});

db.ref('servicios').on('value', (snap) => {
    servicios = snap.val() ? Object.values(snap.val()) : [];
    renderizarTabla();
});

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busq = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        if((s.tecnico + s.placa + s.cliente).toLowerCase().includes(busq) && cumpleFiltroTiempo(s.inicio)) {
            
            const msg = `🚨 *DATATRACK: NUEVA ASIGNACIÓN*\n\n🛠️ *Tarea:* ${s.descripcion}\n📍 *Ciudad:* ${s.ubicacion}\n⏰ *Inicio:* ${s.inicio.replace('T', ' ')}\n⚠️ *OBS:* ${s.observaciones}\n✍️ *Asigna:* ${s.despachador}\n🏢 *Cliente:* ${s.cliente}\n🏠 *Dirección:* ${s.direccion}\n🚗 *Placa:* ${s.placa}`;
            const esc = encodeURIComponent(msg);

            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small>${s.ubicacion}</small></td>
                    <td><span class="text-placa">${s.placa}</span><br><small>${s.equipo}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <a href="https://wa.me/${s.whatsapp}?text=${esc}" target="_blank" class="btn btn-wsp btn-sm"><i class="bi bi-whatsapp"></i></a>
                            <a href="mailto:${s.email}?subject=Servicio ${s.placa}&body=${esc}" class="btn btn-mail btn-sm"><i class="bi bi-envelope"></i></a>
                            <button onclick="prepararEdicion('${s.id}')" class="btn btn-edit btn-sm"><i class="bi bi-pencil-square"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-delete btn-sm"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }
    });
}

function prepararEdicion(id) {
    const s = servicios.find(i => i.id == id);
    if(!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnicoSelect').value = tecnicosDB[s.tecnico] ? s.tecnico : "Otro";
    cargarDatosTecnico();
    document.getElementById('telTecnico').value = s.whatsapp;
    document.getElementById('emailTecnico').value = s.email;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('cantPlacas').value = s.cantVehiculos || 1;
    generarCamposPlacas();
    const plates = s.placa.split(", ");
    document.querySelectorAll('.placa-input').forEach((inp, i) => { if(plates[i]) inp.value = plates[i]; });
    document.getElementById('ubicacion').value = s.ubicacion;
    document.getElementById('direccion').value = s.direccion;
    document.getElementById('inicio').value = s.inicio;
    document.getElementById('fin').value = s.fin;
    document.getElementById('observaciones').value = s.observaciones;
    document.getElementById('cardForm').classList.add('editing');
    document.getElementById('btnSubmit').innerText = "ACTUALIZAR";
    document.getElementById('btnCancel').classList.remove('d-none');
    window.scrollTo(0,0);
}

function cancelarEdicion() {
    document.getElementById('editId').value = "";
    document.getElementById('formServicio').reset();
    document.getElementById('cardForm').classList.remove('editing');
    document.getElementById('btnSubmit').innerText = "GUARDAR";
    document.getElementById('btnCancel').classList.add('d-none');
    generarCamposPlacas();
}

function eliminar(id) { if(confirm('¿Eliminar?')) db.ref('servicios/' + id).remove(); }
function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
}

window.onload = generarCamposPlacas;
