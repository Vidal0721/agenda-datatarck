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
const auth = firebase.auth();
const db = firebase.database();

let servicios = [];
let esAdmin = false;

// 1. FUNCIONES DE ACCESO
function login() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass)
        .catch(err => alert("Error: " + err.message));
}

function accesoTecnico() {
    // Acceso sin contraseña pero con privilegios limitados
    esAdmin = false;
    mostrarApp("Técnico de Campo");
}

function logout() {
    auth.signOut().then(() => location.reload());
}

// 2. CONTROL DE VISTAS
auth.onAuthStateChanged(user => {
    if (user) {
        esAdmin = true;
        mostrarApp("Despachador: " + user.email);
    }
});

function mostrarApp(rolTxt) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rolTxt;

    if (esAdmin) {
        document.getElementById('colForm').classList.remove('hidden');
        document.getElementById('colTabla').className = "col-xl-8 col-lg-7";
        document.querySelectorAll('.colAcciones').forEach(el => el.classList.remove('hidden'));
    } else {
        document.getElementById('colForm').classList.add('hidden');
        document.getElementById('colTabla').className = "col-12";
        document.querySelectorAll('.colAcciones').forEach(el => el.classList.add('hidden'));
    }
    escucharBaseDatos();
}

// 3. LÓGICA DE NEGOCIO (Igual a la anterior pero filtrada por rol)
function escucharBaseDatos() {
    db.ref('servicios').on('value', snap => {
        servicios = snap.val() ? Object.values(snap.val()) : [];
        renderizarTabla();
    });
}

function renderizarTabla() {
    const tabla = document.getElementById('tablaServicios');
    const busq = document.getElementById('filtroTexto').value.toLowerCase();
    tabla.innerHTML = '';

    servicios.forEach(s => {
        if ((s.tecnico + s.placa).toLowerCase().includes(busq)) {
            
            // Botones solo para Admin
            let btnHtml = '';
            if (esAdmin) {
                btnHtml = `
                    <div class="btn-group gap-1">
                        <a href="https://wa.me/${s.whatsapp}" class="btn btn-sm btn-wsp"><i class="bi bi-whatsapp"></i></a>
                        <button onclick="eliminar('${s.id}')" class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
                    </div>`;
            }

            tabla.innerHTML += `
                <tr>
                    <td><span class="fw-bold">${s.tecnico}</span></td>
                    <td><span class="text-placa">${s.placa}</span><br><small>${s.cliente}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td class="text-center colAcciones ${esAdmin ? '' : 'hidden'}">${btnHtml}</td>
                </tr>`;
        }
    });
}

// ... Mantener funciones de generarCamposPlacas() y cargarDatosTecnico() ...
