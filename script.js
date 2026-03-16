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

// --- LÓGICA DE FORMULARIO ---
window.checkOtroTecnico = function(val) {
    const div = document.getElementById('divOtroTecnico');
    if(val === "OTRO") div.classList.remove('hidden');
    else div.classList.add('hidden');
}

// --- LOGIN ---
window.login = function() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(() => alert("Error"));
};

window.accesoTecnico = function() { activarApp("VISTA TÉCNICO"); };
window.logout = function() { auth.signOut().then(() => location.reload()); };

auth.onAuthStateChanged(user => {
    if (user) { esAdmin = true; activarApp("DESPACHADOR: " + user.email); }
});

function activarApp(rol) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('txtRol').innerText = rol;
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
        const data = snap.val();
        for (let id in data) { servicios.push({ id, ...data[id] }); }
        renderizarTabla();
    });
}

// --- RENDERIZADO ROBUSTO (Para registros viejos y nuevos) ---
window.renderizarTabla = function() {
    const tbody = document.getElementById('tablaServicios');
    const busq = document.getElementById('buscador').value.toLowerCase();
    tbody.innerHTML = '';
    
    servicios.forEach(s => {
        // Validación extrema para evitar el "congelamiento" del código
        const tecnicoNombre = s.tecnico || s.nombreTecnico || "Desconocido";
        const placa = s.placas || s.placa || s.vehiculo || "---";
        const cliente = s.cliente || "---";

        if ((tecnicoNombre + placa + cliente).toLowerCase().includes(busq)) {
            const tel = s.wsp ? s.wsp.toString().replace(/\D/g,'') : "";
            
            tbody.innerHTML += `
                <tr>
                    <td><b>${tecnicoNombre}</b><br><small>${s.ciudad || ''}</small></td>
                    <td class="text-center"><span class="text-placa">${placa}</span></td>
                    <td class="text-center">
                        <div class="btn-group gap-1">
                            <button onclick="verDetalles('${s.id}')" class="btn btn-info btn-sm text-white"><i class="bi bi-eye"></i></button>
                            ${esAdmin ? `
                                <button onclick="editar('${s.id}')" class="btn btn-warning btn-sm text-white"><i class="bi bi-pencil"></i></button>
                                <button onclick="eliminar('${s.id}')" class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button>
                                <a href="https://wa.me/${tel}" target="_blank" class="btn btn-success btn-sm ${tel ? '' : 'disabled'}"><i class="bi bi-whatsapp"></i></a>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        }
    });
};

// --- GUARDAR ---
document.getElementById('formServicio').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    
    let tecnicoFinal = document.getElementById('tecnico').value;
    if(tecnicoFinal === "OTRO") {
        tecnicoFinal = document.getElementById('otroTecnicoNombre').value;
    }

    const data = {
        tecnico: tecnicoFinal,
        asignadoPor: document.getElementById('asignadoPor').value,
        wsp: document.getElementById('wsp').value,
        emailNotif: document.getElementById('emailNotif').value,
        ciudad: document.getElementById('ciudad').value,
        direccion: document.getElementById('direccion').value,
        cliente: document.getElementById('cliente').value,
        cantPlacas: document.getElementById('cantPlacas').value,
        placas: document.getElementById('placas').value.toUpperCase(),
        obs: document.getElementById('obs').value,
        inicio: document.getElementById('inicio').value
    };

    if(id) db.ref('servicios/' + id).update(data);
    else db.ref('servicios').push(data);
    
    this.reset();
    document.getElementById('divOtroTecnico').classList.add('hidden');
    document.getElementById('editId').value = '';
    alert("Listo");
});

// --- VER Y EDITAR (Con protección contra datos nulos) ---
window.verDetalles = function(id) {
    try {
        const s = servicios.find(x => x.id === id);
        if(!s) return;
        document.getElementById('detalleContenido').innerHTML = `
            <p><b>Cliente:</b> ${s.cliente || 'N/A'}</p>
            <p><b>Vehículo:</b> ${s.placas || s.placa || s.vehiculo || 'N/A'}</p>
            <p><b>Técnico:</b> ${s.tecnico || 'N/A'}</p>
            <p><b>Dirección:</b> ${s.direccion || ''}</p>
            <hr>
            <p><b>Obs:</b> ${s.obs || '---'}</p>
        `;
        new bootstrap.Modal(document.getElementById('modalVer')).show();
    } catch(e) { console.error(e); alert("Error al cargar este registro viejo."); }
};

window.editar = function(id) {
    try {
        const s = servicios.find(x => x.id === id);
        if(!s) return;
        document.getElementById('editId').value = s.id;
        
        // Manejo de técnico (si no está en la lista, se pone en "OTRO")
        const lista = ["Sebastián León", "Lord Zambrano", "Wilton Posso", "Orlando Lara", "Nilson Payares"];
        if(lista.includes(s.tecnico)) {
            document.getElementById('tecnico').value = s.tecnico;
            document.getElementById('divOtroTecnico').classList.add('hidden');
        } else {
            document.getElementById('tecnico').value = "OTRO";
            document.getElementById('divOtroTecnico').classList.remove('hidden');
            document.getElementById('otroTecnicoNombre').value = s.tecnico || '';
        }

        document.getElementById('wsp').value = s.wsp || '';
        document.getElementById('emailNotif').value = s.emailNotif || s.email || '';
        document.getElementById('cliente').value = s.cliente || '';
        document.getElementById('placas').value = s.placas || s.placa || s.vehiculo || '';
        document.getElementById('ciudad').value = s.ciudad || '';
        document.getElementById('direccion').value = s.direccion || '';
        document.getElementById('inicio').value = s.inicio || '';
        document.getElementById('obs').value = s.obs || '';
        
        document.getElementById('btnGuardar').innerText = "ACTUALIZAR";
        window.scrollTo(0,0);
    } catch(e) { alert("Error en datos antiguos."); }
};

window.eliminar = function(id) {
    if(confirm("¿Borrar?")) db.ref('servicios/' + id).remove();
};
