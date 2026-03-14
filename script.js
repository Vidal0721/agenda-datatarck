// CONFIGURACIÓN FIREBASE
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

// BASE DE DATOS DE TÉCNICOS DATATRACK
const tecnicosDB = {
    "Lord Zambrano": { tel: "573045846852", mail: "lord.zambrano@datatrack.co" },
    "Orlando Lara": { tel: "573123476734", mail: "tecnico2@datatrack.co" },
    "Sebastián León": { tel: "573233669570", mail: "tecnico1@datatrack.co" },
    "Wilton Posso": { tel: "573004501234", mail: "w.posso@datatrack.co" }
};

let servicios = [];
let filtroTiempoActual = 'todos';

// AL CARGAR EL DOCUMENTO
document.addEventListener('DOMContentLoaded', () => {
    // 1. Escuchar cambio de técnico para auto-llenado
    document.getElementById('tecnicoSelect').addEventListener('change', cargarDatosTecnico);
    
    // 2. Escuchar cantidad de placas para generar campos
    document.getElementById('cantPlacas').addEventListener('input', generarCamposPlacas);
    
    // 3. Escuchar cambios de "Otros"
    document.getElementById('equipo').addEventListener('change', () => {
        document.getElementById('otroEquipo').classList.toggle('d-none', document.getElementById('equipo').value !== 'OTRO');
    });
    document.getElementById('descripcion').addEventListener('change', () => {
        document.getElementById('otraTarea').classList.toggle('d-none', document.getElementById('descripcion').value !== 'OTRO');
    });

    // Inicializar primera placa
    generarCamposPlacas();
});

// FUNCIÓN: AUTO-LLENADO
function cargarDatosTecnico() {
    const tecnico = document.getElementById('tecnicoSelect').value;
    const inputOtro = document.getElementById('otroTecnico');
    const telInput = document.getElementById('telTecnico');
    const mailInput = document.getElementById('emailTecnico');

    if (tecnico === "Otro") {
        inputOtro.classList.remove('d-none');
        telInput.value = "";
        mailInput.value = "";
    } else {
        inputOtro.classList.add('d-none');
        if (tecnicosDB[tecnico]) {
            telInput.value = tecnicosDB[tecnico].tel;
            mailInput.value = tecnicosDB[tecnico].mail;
        } else {
            telInput.value = "";
            mailInput.value = "";
        }
    }
}

// FUNCIÓN: GENERAR CAMPOS DE PLACAS
function generarCamposPlacas() {
    const cant = parseInt(document.getElementById('cantPlacas').value) || 1;
    const container = document.getElementById('contenedorPlacas');
    
    // Guardar valores actuales para no borrarlos al escribir el número
    const valoresActuales = Array.from(document.querySelectorAll('.placa-input')).map(i => i.value);
    
    container.innerHTML = '';
    for (let i = 0; i < cant; i++) {
        const val = valoresActuales[i] || "";
        container.innerHTML += `
            <div class="col-md-6 mb-2">
                <label class="form-label">Placa ${i+1}</label>
                <input type="text" class="form-control placa-input" placeholder="DESCONOCIDA" value="${val}">
            </div>`;
    }
}

// FUNCIÓN: GUARDAR
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    const inputsPlacas = document.querySelectorAll('.placa-input');
    const placasArray = Array.from(inputsPlacas).map(inp => inp.value.trim().toUpperCase() || "DESCONOCIDA");
    const placasString = placasArray.join(", ");

    const tecnicoFinal = document.getElementById('tecnicoSelect').value === 'Otro' ? document.getElementById('otroTecnico').value : document.getElementById('tecnicoSelect').value;
    const equipoFinal = document.getElementById('equipo').value === 'OTRO' ? document.getElementById('otroEquipo').value : document.getElementById('equipo').value;
    const tareaFinal = document.getElementById('descripcion').value === 'OTRO' ? document.getElementById('otraTarea').value : document.getElementById('descripcion').value;

    const servicio = {
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

    db.ref('servicios/' + servicio.id).set(servicio).then(() => {
        if(editId) cancelarEdicion();
        this.reset();
        document.getElementById('cantPlacas').value = 1;
        generarCamposPlacas();
        alert("✅ Sincronizado en Firebase.");
    });
});

// ESCUCHA FIREBASE
db.ref('servicios').on('value', (snapshot) => {
    servicios = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderizarTabla();
});

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busqueda = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        const matchBusqueda = (s.tecnico + s.placa + s.cliente).toLowerCase().includes(busqueda);
        
        if(matchBusqueda) {
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
                    <td><span class="fw-bold">${s.tecnico}</span><br><small>${s.ubicacion}</small></td>
                    <td><span class="text-placa">${s.placa}</span><br><small>${s.equipo} - ${s.descripcion}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td>
                        <div class="btn-group gap-1">
                            <a href="https://wa.me/${s.whatsapp}?text=${msgEsc}" target="_blank" class="btn btn-wsp btn-sm"><i class="bi bi-whatsapp"></i></a>
                            <button onclick="prepararEdicion('${s.id}')" class="btn btn-edit btn-sm"><i class="bi bi-pencil-square"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-light btn-sm text-danger"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }
    });
    document.getElementById('contadorHoy').innerText = `Servicios: ${servicios.length}`;
}

function prepararEdicion(id) {
    const s = servicios.find(i => i.id == id);
    if(!s) return;
    
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnicoSelect').value = tecnicosDB[s.tecnico] ? s.tecnico : "Otro";
    cargarDatosTecnico();
    if(document.getElementById('tecnicoSelect').value === "Otro") document.getElementById('otroTecnico').value = s.tecnico;
    
    document.getElementById('telTecnico').value = s.whatsapp;
    document.getElementById('emailTecnico').value = s.email;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('cantPlacas').value = s.cantVehiculos || 1;
    generarCamposPlacas();
    
    const placasIndividuales = s.placa.split(", ");
    document.querySelectorAll('.placa-input').forEach((inp, i) => {
        if(placasIndividuales[i]) inp.value = placasIndividuales[i];
    });

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
function setFiltroTiempo(f) { filtroTiempoActual = f; renderizarTabla(); }
function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Datatrack_Agenda.xlsx");
}
