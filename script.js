// CONFIGURACIÓN CORREGIDA (API KEY EXACTA)
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

let esAdmin = false;

// LOGIN
function login() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => {
        alert("Error: Revisa tus credenciales en la pestaña Users de Firebase.");
    });
}

function accesoTecnico() {
    esAdmin = false;
    activarVistas("Técnico (Sólo Lectura)");
}

function logout() {
    auth.signOut().then(() => location.reload());
}

auth.onAuthStateChanged(user => {
    if (user) {
        esAdmin = true;
        activarVistas("Despachador: " + user.email);
    }
});

function activarVistas(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol;
    
    if(!esAdmin) {
        document.getElementById('mainBody').classList.add('modo-tecnico');
        document.getElementById('colForm').classList.add('hidden');
        document.getElementById('colTabla').className = "col-12";
    }
    cargarDatos();
}

// BASE DE DATOS
function cargarDatos() {
    db.ref('servicios').on('value', snap => {
        const tbody = document.getElementById('tablaServicios');
        tbody.innerHTML = '';
        const data = snap.val();
        for (let id in data) {
            const s = data[id];
            tbody.innerHTML += `
                <tr>
                    <td><b>${s.tecnico}</b><br><small>${s.ciudad}</small></td>
                    <td><span class="text-placa">${s.placas}</span><br><small>${s.equipo} - ${s.tarea}</small></td>
                    <td><small>${s.inicio.replace('T', ' ')}</small></td>
                    <td class="solo-admin">
                        <div class="btn-group gap-1">
                            <a href="https://wa.me/${s.wsp}" class="btn btn-sm btn-success"><i class="bi bi-whatsapp"></i></a>
                            <button onclick="eliminar('${id}')" class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }
    });
}

document.getElementById('formServicio').addEventListener('submit', (e) => {
    e.preventDefault();
    const nuevo = {
        asignadoPor: document.getElementById('asignadoPor').value,
        tecnico: document.getElementById('tecnico').value,
        wsp: document.getElementById('wsp').value,
        email: document.getElementById('emailNotif').value,
        ciudad: document.getElementById('ciudad').value,
        direccion: document.getElementById('direccion').value,
        cliente: document.getElementById('cliente').value,
        placas: document.getElementById('placas').value.toUpperCase(),
        equipo: document.getElementById('equipo').value,
        tarea: document.getElementById('tarea').value,
        obs: document.getElementById('obs').value,
        inicio: document.getElementById('inicio').value,
        fin: document.getElementById('fin').value
    };
    db.ref('servicios').push(nuevo);
    e.target.reset();
    alert("Servicio Sincronizado");
});

function eliminar(id) {
    if(confirm("¿Eliminar registro?")) db.ref('servicios/' + id).remove();
}

function exportarExcel() {
    db.ref('servicios').once('value', snap => {
        const ws = XLSX.utils.json_to_sheet(Object.values(snap.val()));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agenda");
        XLSX.writeFile(wb, "Datatrack_Agenda.xlsx");
    });
}
