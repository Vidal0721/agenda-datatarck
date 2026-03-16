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

window.seleccionarTecnico = (val) => {
    const divO = document.getElementById('divOtro');
    const t = document.getElementById('telTec');
    const m = document.getElementById('emailTec');
    if(val === "OTRO") {
        divO.classList.remove('hidden');
        t.value = ""; m.value = ""; t.readOnly = false; m.readOnly = false;
    } else {
        divO.classList.add('hidden');
        t.value = STAFF[val]?.tel || "";
        m.value = STAFF[val]?.mail || "";
        t.readOnly = true; m.readOnly = true;
    }
};

window.login = () => {
    const e = document.getElementById('userEmail').value;
    const p = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Error: " + err.message));
};

window.accesoTecnico = () => activarApp("INVITADO");
window.logout = () => auth.signOut().then(() => location.reload());

auth.onAuthStateChanged(user => {
    if(user) {
        userLogueado = user.email;
        esAdmin = !user.email.includes('tecnico');
        activarApp(esAdmin ? "ADMIN" : "TECNICO");
    }
});

function activarApp(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol + ": " + (userLogueado || "Lectura");
    if(!esAdmin) {
        document.getElementById('mainBody').classList.add('modo-tecnico');
        document.getElementById('colForm').classList.add('hidden');
        document.getElementById('colTabla').classList.replace('col-md-8', 'col-12');
    }
    db.ref('servicios').on('value', snap => {
        servicios = [];
        snap.forEach(c => { servicios.push({id: c.key, ...c.val()}); });
        renderizar();
    });
}

function renderizar() {
    const tbody = document.getElementById('tablaServicios');
    tbody.innerHTML = '';
    [...servicios].reverse().forEach(s => {
        const hI = (s.inicio || "").split('T')[1] || "";
        tbody.innerHTML += `
            <tr>
                <td><b>${s.tecnico}</b><br><small>${s.cliente}</small></td>
                <td><span class="text-placa">${s.placas || '---'}</span></td>
                <td><span class="badge ${s.estado==='REALIZADA'?'bg-success':'bg-warning text-dark'}">${s.estado}</span></td>
                <td class="text-end">
                    ${esAdmin ? `
                        <button onclick="editar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-pencil"></i></button>
                        <button onclick="eliminar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-trash"></i></button>
                    ` : `
                        ${s.estado==='PENDIENTE' && userLogueado ? `<button onclick="cerrar('${s.id}')" class="btn btn-sm btn-success">Cerrar</button>` : ''}
                    `}
                </td>
            </tr>`;
    });
}

document.getElementById('formServicio').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    let tec = document.getElementById('tecnico').value;
    if(tec === "OTRO") tec = document.getElementById('otroNombre').value;

    const data = {
        tecnico: tec,
        tel: document.getElementById('telTec').value,
        mail: document.getElementById('emailTec').value,
        cliente: document.getElementById('cliente').value,
        direccion: document.getElementById('direccion').value,
        inicio: document.getElementById('fechaInicio').value,
        fin: document.getElementById('fechaFin').value,
        placas: document.getElementById('placasTxt').value.toUpperCase(),
        estado: 'PENDIENTE',
        timestamp: Date.now()
    };

    if(id) {
        db.ref('servicios/' + id).update(data).then(() => { alert("Actualizado"); reset(); });
    } else {
        db.ref('servicios').push(data).then(() => { alert("Guardado"); reset(); });
    }
};

function reset() {
    document.getElementById('formServicio').reset();
    document.getElementById('editId').value = '';
    document.getElementById('btnGuardar').innerText = "GUARDAR";
}

window.cerrar = (id) => {
    if(confirm("¿Confirmar cierre?")) {
        db.ref('servicios/' + id).update({ estado: 'REALIZADA', cerradoPor: userLogueado, fechaCierre: new Date().toLocaleString() });
    }
};

window.editar = (id) => {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = STAFF[s.tecnico] ? s.tecnico : "OTRO";
    seleccionarTecnico(document.getElementById('tecnico').value);
    if(document.getElementById('tecnico').value === "OTRO") document.getElementById('otroNombre').value = s.tecnico;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('direccion').value = s.direccion;
    document.getElementById('fechaInicio').value = s.inicio;
    document.getElementById('fechaFin').value = s.fin;
    document.getElementById('placasTxt').value = s.placas;
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR DATOS";
};

window.eliminar = (id) => { if(confirm("¿Borrar?")) db.ref('servicios/' + id).remove(); };
