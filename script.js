// CONFIGURACIÓN FIREBASE (Tus credenciales reales)
const firebaseConfig = {
  apiKey: "AIzaSyAjh_N7X4nBi6GPnWjxegPX2SKZf7PxW-w",
  authDomain: "agenda-datatrack.firebaseapp.com",
  databaseURL: "https://agenda-datatrack-default-rtdb.firebaseio.com",
  projectId: "agenda-datatrack",
  storageBucket: "agenda-datatrack.firebasestorage.app",
  messagingSenderId: "818633255134",
  appId: "1:818633255134:web:f0d7dfe7f5caf8c4607a4f"
};

// Inicializar
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let servicios = [];
let esAdmin = false;

// 1. GESTIÓN DE ACCESO
function login() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    if(!email || !pass) return alert("Completa los campos.");

    auth.signInWithEmailAndPassword(email, pass)
        .catch(err => alert("Error de acceso: Credenciales incorrectas para Despachador."));
}

function accesoTecnico() {
    esAdmin = false;
    activarApp("Técnico (Visualización)");
}

function logout() {
    auth.signOut().then(() => location.reload());
}

// Escuchar cambio de estado Auth
auth.onAuthStateChanged(user => {
    if (user) {
        esAdmin = true;
        activarApp("Despachador: " + user.email);
    }
});

function activarApp(rolTxt) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rolTxt;

    if (esAdmin) {
        document.getElementById('mainBody').classList.remove('modo-tecnico');
    } else {
        document.getElementById('mainBody').classList.add('modo-tecnico');
    }
    escucharBaseDatos();
}

// 2. LÓGICA DE NEGOCIO
function escucharBaseDatos() {
    db.ref('servicios').on('value', snap => {
        servicios = snap.val() ? Object.values(snap.val()) : [];
        renderizarTabla();
    });
}

function generarCamposPlacas() {
    const cant = parseInt(document.getElementById('cantPlacas').value) || 1;
    const container = document.getElementById('contenedorPlacas');
    container.innerHTML = '';
    for (let i = 0; i < cant; i++) {
        container.innerHTML += `<div class="col-md-6 mb-2"><input type="text" class="form-control placa-input" placeholder="PLACA ${i+1}" required></div>`;
    }
}

document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const pArray = Array.from(document.querySelectorAll('.placa-input')).map(i => i.value.trim().toUpperCase());
    
    const obj = {
        id: Date.now(),
        tecnico: document.getElementById('tecnicoSelect').value,
        placa: pArray.join(", "),
        cliente: document.getElementById('cliente').value,
        ubicacion: document.getElementById('ubicacion').value,
        equipo: document.getElementById('equipo').value,
        inicio: document.getElementById('inicio').value
    };

    db.ref('servicios/' + obj.id).set(obj).then(() => {
        this.reset();
        generarCamposPlacas();
        alert("✅ Servicio guardado en la nube.");
    });
});

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busq = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    servicios.sort((a,b) => new Date(a.inicio) - new Date(b.inicio)).forEach(s => {
        if((s.tecnico + s.placa).toLowerCase().includes(busq)) {
            
            let btnHtml = '';
            if (esAdmin) {
                btnHtml = `
                    <div class="btn-group gap-1">
                        <button onclick="eliminar('${s.id}')" class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
                    </div>`;
            }

            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span><br><small class="text-muted">${s.ubicacion}</small></td>
                    <td><span class="text-placa">${s.placa}</span><br><small>${s.cliente} - ${s.equipo}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td class="text-center solo-admin">${btnHtml}</td>
                </tr>`;
        }
    });
}

function eliminar(id) {
    if(confirm("¿Seguro de eliminar este servicio?")) {
        db.ref('servicios/' + id).remove();
    }
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(servicios);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Datatrack_Agenda.xlsx");
}

window.onload = generarCamposPlacas;
