// CONFIGURACIÓN FIREBASE
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

// BASE DE DATOS DE TÉCNICOS
const STAFF = {
    "Sebastián León": { mail: "tecnico1@datatrack.co", tel: "573135307403" },
    "Orlando Lara": { mail: "tecnico2@datatrack.co", tel: "573135307403" },
    "Lord Zambrano": { mail: "lord.tecnico3@datatrack.co", tel: "573135307403" }
};

// AUTOLLENADO DE TÉCNICO
window.seleccionarTecnico = function(val) {
    const divOtro = document.getElementById('divOtro');
    const tel = document.getElementById('telTec');
    const mail = document.getElementById('emailTec');

    if(val === "OTRO") {
        divOtro.classList.remove('hidden');
        tel.value = ""; mail.value = "";
        tel.readOnly = false; mail.readOnly = false;
    } else {
        divOtro.classList.add('hidden');
        tel.value = STAFF[val]?.tel || "";
        mail.value = STAFF[val]?.mail || "";
        tel.readOnly = true; mail.readOnly = true;
    }
};

window.generarInputsPlacas = function(cant) {
    const cont = document.getElementById('contenedorPlacas');
    cont.innerHTML = '';
    for(let i=0; i<cant; i++) {
        cont.innerHTML += `<input type="text" class="form-control form-control-sm input-placa mb-1" placeholder="Placa ${i+1}" style="width: 100px; text-transform:uppercase">`;
    }
};

// GESTIÓN DE ACCESO
window.login = function() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert("Error de acceso"));
};

window.accesoTecnico = function() { activarApp("CONSULTA"); };
window.logout = function() { auth.signOut().then(() => location.reload()); };

auth.onAuthStateChanged(user => {
    if(user) {
        userLogueado = user.email;
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

window.renderizarTabla = function() {
    const tbody = document.getElementById('tablaServicios');
    tbody.innerHTML = '';
    
    // Invertimos para que lo más nuevo salga primero
    const listaInversa = [...servicios].reverse();

    listaInversa.forEach(s => {
        const est = s.estado || 'PENDIENTE';
        const badgeColor = est === 'REALIZADA' ? 'badge-realizado' : 'badge-pendiente';
        const hI = (s.inicio || "").split('T')[1] || "00:00";
        const hF = (s.fin || "").split('T')[1] || "00:00";

        tbody.innerHTML += `
            <tr>
                <td><b>${s.tecnico}</b><br><small class="text-muted">${s.cliente}</small></td>
                <td class="text-center"><span class="text-placa">${s.placas || 'N/A'}</span></td>
                <td class="text-center">${hI} - ${hF}<br><span class="badge ${badgeColor}">${est}</span></td>
                <td class="text-center">
                    <div class="btn-group gap-1">
                        <button onclick="verDetalles('${s.id}')" class="btn btn-outline-primary btn-sm"><i class="bi bi-eye"></i></button>
                        ${esAdmin ? `
                            <button onclick="editar('${s.id}')" class="btn btn-outline-warning btn-sm"><i class="bi bi-pencil"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button>
                        ` : `
                            ${est === 'PENDIENTE' && userLogueado ? `<button onclick="cerrarServicio('${s.id}')" class="btn btn-success btn-sm">Cerrar</button>` : ''}
                        `}
                    </div>
                </td>
            </tr>`;
    });
};

// GUARDAR Y ACTUALIZAR
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    
    const placasVal = Array.from(document.querySelectorAll('.input-placa'))
                           .map(i => i.value.trim().toUpperCase())
                           .filter(v => v !== "")
                           .join(', ') || 'POR DEFINIR';
    
    let tecnicoNombre = document.getElementById('tecnico').value;
    if(tecnicoNombre === "OTRO") tecnicoNombre = document.getElementById('otroNombre').value;

    const data = {
        tecnico: tecnicoNombre,
        tel: document.getElementById('telTec').value,
        mail: document.getElementById('emailTec').value,
        cliente: document.getElementById('cliente').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('fechaInicio').value,
        fin: document.getElementById('fechaFin').value,
        placas: placasVal,
        estado: 'PENDIENTE',
        timestamp: Date.now()
    };

    if(id) {
        db.ref('servicios/' + id).update(data).then(() => {
            alert("Asignación Actualizada!");
            limpiarFormulario();
        });
    } else {
        db.ref('servicios').push(data).then(() => {
            alert("Asignación Guardada!");
            limpiarFormulario();
        });
    }
});

function limpiarFormulario() {
    document.getElementById('formServicio').reset();
    document.getElementById('editId').value = '';
    document.getElementById('contenedorPlacas').innerHTML = '<input type="text" class="form-control form-control-sm input-placa" placeholder="Placa 1" style="width: 100px;">';
    document.getElementById('btnGuardar').innerText = "GUARDAR ASIGNACIÓN";
}

window.cerrarServicio = function(id) {
    if(confirm("¿Cerrar servicio? Se registrará tu firma.")) {
        db.ref('servicios/' + id).update({
            estado: 'REALIZADA',
            cerradoPor: userLogueado,
            fechaCierre: new Date().toLocaleString()
        });
    }
};

window.verDetalles = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    document.getElementById('detalleContenido').innerHTML = `
        <p><b>Técnico:</b> ${s.tecnico}</p>
        <p><b>Cliente:</b> ${s.cliente}</p>
        <p><b>Dirección:</b> ${s.direccion || 'N/A'}</p>
        <p><b>Placas:</b> <span class="text-danger fw-bold">${s.placas}</span></p>
        <p><b>Horario:</b> ${s.inicio} a ${s.fin}</p>
        <hr>
        <p class="small text-muted">Cerrado por: ${s.cerradoPor || 'Pendiente'}<br>Firma: ${s.fechaCierre || 'N/A'}</p>
    `;
    new bootstrap.Modal(document.getElementById('modalVer')).show();
};

window.editar = function(id) {
    const s = servicios.find(x => x.id === id);
    if(!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = STAFF[s.tecnico] ? s.tecnico : "OTRO";
    seleccionarTecnico(document.getElementById('tecnico').value);
    if(document.getElementById('tecnico').value === "OTRO") document.getElementById('otroNombre').value = s.tecnico;

    document.getElementById('cliente').value = s.cliente;
    document.getElementById('direccion').value = s.direccion;
    document.getElementById('fechaInicio').value = s.inicio;
    document.getElementById('fechaFin').value = s.fin;
    
    // Reconstruir Placas
    const pList = s.placas.split(', ');
    const cont = document.getElementById('contenedorPlacas');
    cont.innerHTML = '';
    pList.forEach(p => {
        cont.innerHTML += `<input type="text" class="form-control form-control-sm input-placa mb-1" value="${p}" style="width: 100px; text-transform:uppercase">`;
    });

    document.getElementById('btnGuardar').innerText = "ACTUALIZAR";
    window.scrollTo(0,0);
};

window.eliminar = function(id) {
    if(confirm("¿Eliminar?")) db.ref('servicios/' + id).remove();
};

window.exportarExcel = function() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Datatrack_Reporte.xlsx");
};
