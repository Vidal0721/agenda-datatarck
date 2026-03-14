// CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAjh_N7X4nBi6GPnWjexgPX2SKZf7PxW-w",
  authDomain: "agenda-datatrack.firebaseapp.com",
  projectId: "agenda-datatrack",
  storageBucket: "agenda-datatrack.firebasestorage.app",
  messagingSenderId: "818633255134",
  appId: "1:818633255134:web:f0d7dfe7f5caf8c4607a4f",
  measurementId: "G-9YNWWGVVD6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// BASE DE DATOS TÉCNICOS
const tecnicosDB = {
    "Lord Zambrano": { tel: "573045846852", mail: "lord.zambrano@datatrack.co" },
    "Orlando Lara": { tel: "573123476734", mail: "tecnico2@datatrack.co" },
    "Sebastián León": { tel: "573233669570", mail: "tecnico1@datatrack.co" },
    "Wilton Posso": { tel: "573004501234", mail: "w.posso@datatrack.co" }
};

let servicios = [];
let filtroTiempoActual = 'todos';

// CARGA AUTOMÁTICA DE DATOS
function cargarDatosTecnico() {
    const tecnico = document.getElementById('tecnicoSelect').value;
    const inputOtro = document.getElementById('otroTecnico');
    
    if (tecnico === "Otro") {
        inputOtro.classList.remove('d-none');
        document.getElementById('telTecnico').value = "";
        document.getElementById('emailTecnico').value = "";
    } else {
        inputOtro.classList.add('d-none');
        if (tecnicosDB[tecnico]) {
            document.getElementById('telTecnico').value = tecnicosDB[tecnico].tel;
            document.getElementById('emailTecnico').value = tecnicosDB[tecnico].mail;
        }
    }
}

// GENERAR CAMPOS PARA MÚLTIPLES PLACAS
function generarCamposPlacas() {
    const cant = parseInt(document.getElementById('cantPlacas').value) || 1;
    const container = document.getElementById('contenedorPlacas');
    container.innerHTML = '';
    for (let i = 1; i <= cant; i++) {
        container.innerHTML += `
            <div class="col-md-6 mb-2">
                <label class="form-label">Placa ${i}</label>
                <input type="text" class="form-control placa-input" placeholder="DESCONOCIDA">
            </div>`;
    }
}

// LÓGICA DE SOLAPAMIENTO PRECISA
function hayChoque(nuevo, editId) {
    const nIni = new Date(nuevo.inicio).getTime();
    const nFin = new Date(nuevo.fin).getTime();
    if (nFin <= nIni) { alert("🚨 Fin debe ser después del Inicio."); return true; }

    return servicios.some(s => {
        if (editId && s.id == editId) return false;
        if (s.tecnico !== nuevo.tecnico) return false;
        const sIni = new Date(s.inicio).getTime();
        const sFin = new Date(s.fin).getTime();
        return (nIni < sFin - 1000 && nFin > sIni + 1000);
    });
}

// GUARDAR / ACTUALIZAR
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    // Unir todas las placas
    const inputsPlacas = document.querySelectorAll('.placa-input');
    const placasArray = Array.from(inputsPlacas).map(inp => inp.value.trim().toUpperCase() || "DESCONOCIDA");
    const placasString = placasArray.join(", ");

    const tecnicoFinal = document.getElementById('tecnicoSelect').value === 'Otro' ? document.getElementById('otroTecnico').value : document.getElementById('tecnicoSelect').value;
    const equipoFinal = document.getElementById('equipo').value === 'OTRO' ? document.getElementById('otroEquipo').value : document.getElementById('equipo').value;
    const tareaFinal = document.getElementById('descripcion').value === 'OTRO' ? document.getElementById('otraTarea').value : document.getElementById('descripcion').value;

    const obj = {
        id: editId ? parseInt(editId) : Date.now(),
        tecnico: tecnicoFinal,
        whatsapp: document.getElementById('telTecnico').value,
        email: document.getElementById('emailTecnico').value,
        despachador: document.getElementById('despachador').value,
        cliente: document.getElementById('cliente').value,
        placa: placasString,
        equipo: equipoFinal,
        descripcion: tareaFinal,
        observaciones: document.getElementById('observaciones').value || "Ninguna",
        ubicacion: document.getElementById('ubicacion').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value,
        cantVehiculos: placasArray.length
    };

    if (hayChoque(obj, editId)) {
        alert("🚨 El técnico ya tiene un servicio asignado en ese horario.");
        return;
    }

    db.ref('servicios/' + obj.id).set(obj).then(() => {
        if(editId) cancelarEdicion();
        this.reset();
        generarCamposPlacas();
        alert("✅ Sincronizado correctamente.");
    });
});

// RENDERIZAR AGENDA
db.ref('servicios').on('value', (snapshot) => {
    servicios = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderizarTabla();
});

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busqueda = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    const ahora = new Date();
    const hoyStr = ahora.toLocaleDateString('en-CA');
    const ayerDate = new Date(); ayerDate.setDate(ahora.getDate() - 1);
    const ayerStr = ayerDate.toLocaleDateString('en-CA');

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        const fechaS = s.inicio.split('T')[0];
        const dateS = new Date(s.inicio);

        let pasaT = true;
        if(filtroTiempoActual === 'hoy') pasaT = (fechaS === hoyStr);
        if(filtroTiempoActual === 'ayer') pasaT = (fechaS === ayerStr);
        if(filtroTiempoActual === 'semana') {
            const fS = new Date(); fS.setDate(ahora.getDate() + 7);
            pasaT = (dateS >= ahora && dateS <= fS);
        }
        if(filtroTiempoActual === 'mes') {
            pasaT = (dateS.getMonth() === ahora.getMonth() && dateS.getFullYear() === ahora.getFullYear());
        }

        const textoBusqueda = (s.tecnico + s.placa + s.cliente).toLowerCase();

        if(pasaT && textoBusqueda.includes(busqueda)) {
            // FORMATO DE MENSAJE SOLICITADO
            const msgBody = `🚨 *DATATRACK: NUEVA ASIGNACIÓN*\n\n` +
                `🛠️ *Tarea:* ${s.descripcion}\n` +
                `📍 *Ciudad:* ${s.ubicacion}\n` +
                `⏰ *Inicio:* ${s.inicio.replace('T', ' ')}\n` +
                `⚠️ *OBS:* ${s.observaciones}\n` +
                `✍️ *Asigna:* ${s.despachador}\n` +
                `🏢 *Cliente:* ${s.cliente}\n` +
                `🏠 *Direccion/Ref:* ${s.direccion}\n` +
                `🚗 *Vehículo(s):* ${s.placa}`;
            
            const msgEsc = encodeURIComponent(msgBody);

            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small class="text-muted">${s.ubicacion}</small></td>
                    <td><span class="text-placa">${s.placa}</span><br><small>${s.descripcion}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td>
                        <div class="btn-group gap-1">
                            <a href="https://wa.me/${s.whatsapp}?text=${msgEsc}" target="_blank" class="btn btn-wsp btn-sm"><i class="bi bi-whatsapp"></i></a>
                            <a href="mailto:${s.email}?subject=Servicio ${s.placa}&body=${msgEsc}" class="btn btn-imei btn-sm"><i class="bi bi-envelope-at"></i></a>
                            <button onclick="prepararEdicion('${s.id}')" class="btn btn-edit btn-sm"><i class="bi bi-pencil-square"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-light btn-sm text-danger"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }
    });
    document.getElementById('contadorHoy').innerText = `Total: ${servicios.length}`;
}

// FUNCIONES AUXILIARES
function setFiltroTiempo(f) { filtroTiempoActual = f; renderizarTabla(); }
function toggleOtroEquipo() { document.getElementById('otroEquipo').classList.toggle('d-none', document.getElementById('equipo').value !== 'OTRO'); }
function toggleOtraTarea() { document.getElementById('otraTarea').classList.toggle('d-none', document.getElementById('descripcion').value !== 'OTRO'); }

function prepararEdicion(id) {
    const s = servicios.find(i => i.id == id);
    if(!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnicoSelect').value = Object.keys(tecnicosDB).includes(s.tecnico) ? s.tecnico : "Otro";
    cargarDatosTecnico();
    if(document.getElementById('tecnicoSelect').value === "Otro") document.getElementById('otroTecnico').value = s.tecnico;
    
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('cantPlacas').value = s.cantVehiculos || 1;
    generarCamposPlacas();
    const plates = s.placa.split(", ");
    document.querySelectorAll('.placa-input').forEach((inp, idx) => { if(plates[idx]) inp.value = plates[idx]; });

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

function eliminar(id) { if(confirm('¿Eliminar servicio?')) db.ref('servicios/' + id).remove(); }
function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Agenda_Datatrack.xlsx");
}


