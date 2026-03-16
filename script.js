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
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Error: Credenciales inválidas"));
};

window.accesoTecnico = () => activarApp("INVITADO");
window.logout = () => auth.signOut().then(() => location.reload());

auth.onAuthStateChanged(user => {
    if(user) {
        userLogueado = user.email;
        // Si el correo NO contiene la palabra "tecnico", es admin (Vidal o Deivis)
        esAdmin = !user.email.toLowerCase().includes('tecnico');
        activarApp(esAdmin ? "ADMINISTRADOR" : "TÉCNICO");
    }
});

function activarApp(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol + ": " + (userLogueado ? userLogueado.split('@')[0] : "Lectura");
    
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
    const filtro = document.getElementById('filtro').value.toLowerCase();
    tbody.innerHTML = '';
    
    [...servicios].reverse().forEach(s => {
        if((s.tecnico + s.cliente + s.placas).toLowerCase().includes(filtro)) {
            const hI = (s.inicio || "").split('T')[1] || "00:00";
            const hF = (s.fin || "").split('T')[1] || "00:00";
            const esRealizada = s.estado === 'REALIZADA';

            tbody.innerHTML += `
                <tr>
                    <td><b>${s.tecnico}</b><br><small class="text-muted">${s.cliente}</small></td>
                    <td><span class="text-placa">${s.placas || '---'}</span></td>
                    <td class="small">${hI} - ${hF}<br><span class="badge ${esRealizada ? 'badge-realizada':'badge-pendiente'}">${s.estado}</span></td>
                    <td>
                        <div class="btn-group">
                        ${esAdmin ? `
                            <button onclick="editar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-pencil text-warning"></i></button>
                            <button onclick="eliminar('${s.id}')" class="btn btn-sm btn-light border"><i class="bi bi-trash text-danger"></i></button>
                        ` : `
                            ${!esRealizada && userLogueado ? `<button onclick="cerrar('${s.id}')" class="btn btn-sm btn-success fw-bold">Cerrar</button>` : ''}
                        `}
                        </div>
                    </td>
                </tr>`;
        }
    });
}

document.getElementById('formServicio').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    let tec = document.getElementById('tecnico').value;
    if(tec === "OTRO") tec = document.getElementById('otroNombre').value;

    const inicioNuevo = new Date(document.getElementById('fechaInicio').value).getTime();
    const finNuevo = new Date(document.getElementById('fechaFin').value).getTime();

    // --- VALIDACIÓN DE CRUCE DE HORARIOS ---
    const cruce = servicios.find(s => 
        s.id !== id && 
        s.tecnico === tec && 
        s.estado === 'PENDIENTE' &&
        ((inicioNuevo >= new Date(s.inicio).getTime() && inicioNuevo < new Date(s.fin).getTime()) ||
         (finNuevo > new Date(s.inicio).getTime() && finNuevo <= new Date(s.fin).getTime()))
    );

    if(cruce) {
        alert("¡ERROR DE SOLAPAMIENTO!\n" + tec + " ya tiene un servicio asignado de " + cruce.inicio.split('T')[1] + " a " + cruce.fin.split('T')[1]);
        return;
    }

    const data = {
        tecnico: tec,
        tel: document.getElementById('telTec').value,
        mail: document.getElementById('emailTec').value,
        cliente: document.getElementById('cliente').value,
        inicio: document.getElementById('fechaInicio').value,
        fin: document.getElementById('fechaFin').value,
        placas: document.getElementById('placasTxt').value.toUpperCase(),
        estado: 'PENDIENTE',
        timestamp: Date.now()
    };

    if(id) {
        db.ref('servicios/' + id).update(data).then(() => { alert("Servicio Actualizado"); reset(); });
    } else {
        db.ref('servicios').push(data).then(() => { alert("Servicio Guardado con Éxito"); reset(); });
    }
};

function reset() {
    document.getElementById('formServicio').reset();
    document.getElementById('editId').value = '';
    document.getElementById('btnGuardar').innerText = "GUARDAR ASIGNACIÓN";
}

window.cerrar = (id) => {
    if(confirm("¿Confirmas que el servicio fue realizado? Se guardará tu firma corporativa.")) {
        db.ref('servicios/' + id).update({ 
            estado: 'REALIZADA', 
            cerradoPor: userLogueado, 
            fechaCierre: new Date().toLocaleString() 
        }).then(() => alert("Servicio Cerrado Correctamente"));
    }
};

window.editar = (id) => {
    const s = servicios.find(x => x.id === id);
    document.getElementById('editId').value = s.id;
    document.getElementById('tecnico').value = STAFF[s.tecnico] ? s.tecnico : "OTRO";
    seleccionarTecnico(document.getElementById('tecnico').value);
    if(document.getElementById('tecnico').value === "OTRO") document.getElementById('otroNombre').value = s.tecnico;
    document.getElementById('cliente').value = s.cliente;
    document.getElementById('fechaInicio').value = s.inicio;
    document.getElementById('fechaFin').value = s.fin;
    document.getElementById('placasTxt').value = s.placas;
    document.getElementById('btnGuardar').innerText = "ACTUALIZAR DATOS";
    window.scrollTo(0,0);
};

window.eliminar = (id) => { if(confirm("¿Seguro que deseas eliminar este registro?")) db.ref('servicios/' + id).remove(); };
