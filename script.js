// CONFIGURACIÓN OFICIAL DATATRACK
const firebaseConfig = {
    apiKey: "AIzaSyAjh_N7X4nBi6GPnWjxegPX2SKZf7PxW-w",
    authDomain: "agenda-datatrack.firebaseapp.com",
    databaseURL: "https://agenda-datatrack-default-rtdb.firebaseio.com",
    projectId: "agenda-datatrack",
    storageBucket: "agenda-datatrack.firebasestorage.app",
    messagingSenderId: "818633255134",
    appId: "1:818633255134:web:f0d7dfe7f5caf8c4607a4f"
};

// Inicialización
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let esAdmin = false;

// ACCESO
function login() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => {
        alert("Error: Verifica que el usuario exista en la pestaña 'Users' de Firebase.");
    });
}

function accesoTecnico() {
    esAdmin = false;
    mostrarApp("Técnico (Lectura)");
}

function logout() {
    auth.signOut().then(() => location.reload());
}

auth.onAuthStateChanged(user => {
    if (user) {
        esAdmin = true;
        mostrarApp("Despachador: " + user.email);
    }
});

function mostrarApp(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol;
    
    if(!esAdmin) {
        document.getElementById('mainBody').classList.add('modo-tecnico');
        document.getElementById('panelForm').classList.add('hidden');
        document.getElementById('panelTabla').className = "col-12";
    }
    cargarDatos();
}

// DATOS
function cargarDatos() {
    db.ref('servicios').on('value', snap => {
        const tabla = document.getElementById('tablaServicios');
        tabla.innerHTML = '';
        const data = snap.val();
        for (let id in data) {
            const s = data[id];
            tabla.innerHTML += `
                <tr>
                    <td><b>${s.tecnico}</b></td>
                    <td class="text-placa">${s.placa}</td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td class="solo-admin">
                        <button onclick="eliminar('${id}')" class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        }
    });
}

document.getElementById('formServicio').addEventListener('submit', (e) => {
    e.preventDefault();
    const nuevo = {
        tecnico: document.getElementById('tecnicoSelect').value,
        placa: document.getElementById('placa').value.toUpperCase(),
        inicio: document.getElementById('inicio').value
    };
    db.ref('servicios').push(nuevo);
    e.target.reset();
});

function eliminar(id) {
    if(confirm("¿Eliminar registro?")) db.ref('servicios/' + id).remove();
}
