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
    "Lord Zambrano": { mail: "lord.tecnico3@datatrack.co", tel: "573135307403" }
};

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
    validarSolapamiento();
};

window.validarSolapamiento = function() {
    const tec = document.getElementById('tecnico').value;
    const inicio = new Date(document.getElementById('fechaInicio').value).getTime();
    const fin = new Date(document.getElementById('fechaFin').value).getTime();
    const alerta = document.getElementById('alertaCruce');
    const editId = document.getElementById('editId').value;

    if(!tec || !inicio || !fin) return alerta.classList.add('hidden');

    const cruce = servicios.find(s => 
        s.id !== editId &&
        s.tecnico === tec &&
        s.estado === 'PENDIENTE' &&
        ((inicio >= new Date(s.inicio).getTime() && inicio < new Date(s.fin).getTime()) ||
         (fin > new Date(s.inicio).getTime() && fin <= new Date(s.fin).getTime()))
    );

    cruce ? alerta.classList.remove('hidden') : alerta.classList.add('hidden');
};

window.generarInputsPlacas = function(cant) {
    const cont = document.getElementById('contenedorPlacas');
    cont.innerHTML = '';
    for(let i=0; i<cant; i++) cont.innerHTML += `<input type="text" class="form-control form-control-sm input-placa mb-1" placeholder="Placa ${i+1}" style="width: 100px;">`;
};

// --- AUTH ---
window.login = function() {
    auth.signInWithEmailAndPassword(document.getElementById('userEmail').value, document.getElementById('userPass').value).catch(() => alert("Error"));
};
window.accesoTecnico = function() { activarApp("INVITADO"); };
window.logout = function() { auth.signOut().then(() => location.reload()); };

auth.onAuthStateChanged(user => {
    if(user) {
        userLogueado = user.email;
        esAdmin = !user.email.includes('tecnico');
        activarApp(esAdmin ? "DESPACHADOR" : "TÉCNICO");
    }
});

function activarApp(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol + ": " + (userLogueado || "Lectura");
    if(!esAdmin) document.getElementById('mainBody').classList.add('modo-tecnico');
    escucharDatos();
}

function escucharDatos() {
    db.ref('servicios').on('value', snap => {
        servicios = [];
        snap.forEach(c => { servicios.push({ id: c.key, ...c.val() }); });
        renderizarTabla();
    });
}

window.renderizarTabla = function() {
    const tbody = document.getElementById('tablaServicios');
    tbody.innerHTML = '';
    servicios.reverse().forEach(s => {
        const est = s.estado || 'PENDIENTE';
        const color = est === 'REALIZADA' ? 'badge-realizado' : 'badge-pendiente';
        const hI = (s.inicio || "").split('T')[1];
        const hF = (s.fin || "").split('T')[1];

        tbody.innerHTML += `
            <tr>
                <td><b>${s.tecnico}</b><br><small>${s.cliente}</small></td>
                <td class="text-center"><span class="text-placa">${s.placas}</span></td>
                <td class="text-center small">${hI} - ${hF} <br> <span class="badge ${color}">${est}</span></td>
                <td class="text-center">
                    <div class="btn-group gap-1">
                        <button onclick="verDetalles('${s.id}')" class="btn btn-light btn-sm"><i class="bi bi-eye"></i></button>
                        ${esAdmin ? `
                            <button onclick="editar('${s.id}')" class="btn btn-light btn-sm"><i class="bi bi-pencil"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-light btn-sm"><i class="bi bi-trash"></i></button>
                        ` : `
                            ${est === 'PENDIENTE' && userLogueado ? `<button onclick="cerrarServicio('${s.id}')" class="btn btn-success btn-sm">Cerrar</button>` : ''}
                        `}
                    </div>
                </td>
            </tr>`;
    });
};

document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const placas = Array.from(document.querySelectorAll('.input-placa')).map(i => i.value.toUpperCase() || 'P/D').join(', ');
    
    const data = {
        tecnico: document.getElementById('tecnico').value === "OTRO" ? document.getElementById('otroNombre').value : document.getElementById('tecnico').value,
        tel: document.getElementById('telTec').value,
        mail: document.getElementById('emailTec').value,
        cliente: document.getElementById('cliente').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('fechaInicio').value,
        fin: document.getElementById('fechaFin').value,
        placas: placas,
        estado: 'PENDIENTE'
    };

    if(id) db.ref('servicios/' + id).update(data);
    else db.ref('servicios').push(data);
    this.reset();
    document.getElementById('editId').value = '';
});

window.cerrarServicio = function(id) {
    if(confirm("¿Cerrar servicio? Se registrará como: " + userLogueado)) {
        db.ref('servicios/' + id).update({
            estado: 'REALIZADA',
            cerradoPor: userLogueado,
            fechaCierre: new Date().toLocaleString()
        });
    }
};

window.verDetalles = function(id) {
    const s = servicios.find(x => x.id === id);
    document.getElementById('detalleContenido').innerHTML = `
        <h6 class="fw-bold border-bottom pb-2">SERVICIO: ${s.estado}</h6>
        <p class="small"><b>Técnico:</b> ${s.tecnico}<br><b>Cliente:</b> ${s.cliente}<br><b>Placas:</b> ${s.placas}</p>
        <p class="small text-success"><b>Cerrado por:</b> ${s.cerradoPor || 'Pendiente'}<br><b>Hora Cierre:</b> ${s.fechaCierre || '---'}</p>
    `;
    new bootstrap.Modal(document.getElementById('modalVer')).show();
};

window.exportarExcel = function() {
    XLSX.writeFile(XLSX.utils.book_new(), "Reporte.xlsx"); // Simplificado para prueba
};
