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

// LOGIN Y ROLES
function login() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(() => alert("Credenciales incorrectas"));
}

function accesoTecnico() {
    esAdmin = false;
    mostrarApp("VISTA DE CAMPO (SOLO LECTURA)");
}

function logout() { auth.signOut().then(() => location.reload()); }

auth.onAuthStateChanged(user => {
    if (user) {
        esAdmin = true;
        mostrarApp("DESPACHADOR: " + user.email);
    }
});

function mostrarApp(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol;
    if(!esAdmin) document.getElementById('mainBody').classList.add('modo-tecnico');
    escucharDatos();
}

// LÓGICA DE DATOS
function escucharDatos() {
    db.ref('servicios').on('value', snap => {
        servicios = snap.val() ? Object.entries(snap.val()).map(([id, data]) => ({id, ...data})) : [];
        renderizarTabla();
    });
}

function setFiltro(val) {
    filtroActual = val;
    renderizarTabla();
}

function renderizarTabla() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    tbody.innerHTML = '';

    const hoy = new Date().toISOString().split('T')[0];

    servicios.forEach(s => {
        const fechaS = s.inicio.split('T')[0];
        
        // Aplicar Filtro de Fecha
        let pasaFiltro = true;
        if(filtroActual === 'hoy' && fechaS !== hoy) pasaFiltro = false;
        if(filtroActual === 'semana') {
            const diff = (new Date(fechaS) - new Date(hoy)) / (1000 * 60 * 60 * 24);
            if(diff < 0 || diff > 7) pasaFiltro = false;
        }

        // Aplicar Buscador
        const cumpleBusqueda = (s.tecnico + s.placas + s.cliente).toLowerCase().includes(busq);

        if(pasaFiltro && cumpleBusqueda) {
            tbody.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small class="text-muted">${s.ciudad}</small></td>
                    <td><span class="text-placa">${s.placas}</span><br><span class="badge bg-secondary badge-tarea">${s.tarea}</span></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-outline-info btn-sm"><i class="bi bi-eye"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-outline-warning btn-sm"><i class="bi bi-pencil"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button>
                                <a href="https://wa.me/${s.wsp}" target="_blank" class="btn btn-outline-success btn-sm"><i class="bi bi-whatsapp"></i></a>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        }
    });
}

// ACCIONES
document.getElementById('formServicio').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = {
        tecnico: document.getElementById('tecnico').value,
        placas: document.getElementById('placas').value.toUpperCase(),
        cliente: document.getElementById('cliente').value,
        ciudad: document.getElementById('ciudad').value,
        wsp: document.getElementById('wsp').value,
        equipo: document.getElementById('equipo').value,
        tarea: document.getElementById('tarea').value,
        inicio: document.getElementById('inicio').value
    };

    if(id) db.ref('servicios/' + id).update(data);
    else db.ref('servicios').push(data);
    
    e.target.reset();
    document.getElementById('editId').value = '';
    alert("Operación exitosa.");
});

function verDetalles(id) {
    const s = servicios.find(x => x.id === id);
    document.getElementById('detalleContenido').innerHTML = `
        <p><b>Cliente:</b> ${s.cliente}</p>
        <p><b>Placas:</b> ${s.placas}</p>
        <p><b>Técnico:</b> ${s.tecnico}</p>
        <p><b>Equipo:</b> ${s.equipo}</p>
        <p><b>Tarea:</b> ${s.tarea}</p>
        <p><b>Programación:</b> ${s.inicio.replace('T', ' ')}</p>
        <p><b>Ciudad:</b> ${s.ciudad}</p>
    `;
    new bootstrap.Modal('#modalVer').show();
}

function editar(id) {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = s.tecnico;
    document.getElementById('placas').value = s.placas;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('ciudad').value = s.ciudad;
    document.getElementById('wsp').value = s.wsp;
    document.getElementById('equipo').value = s.equipo;
    document.getElementById('tarea').value = s.tarea;
    document.getElementById('inicio').value = s.inicio;
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR SERVICIO";
}

function eliminar(id) {
    if(confirm("¿Eliminar este servicio de la agenda?")) db.ref('servicios/' + id).remove();
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");
    XLSX.writeFile(wb, "Datatrack_Agenda.xlsx");
}
