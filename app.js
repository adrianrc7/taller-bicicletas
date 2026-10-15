const API_URL = "http://127.0.0.1:8000/api/ordenes";

let ordenesGlobales = [];

// Elementos del DOM
const modal = document.getElementById("modal-orden");
const btnNuevaOrden = document.getElementById("btn-nueva-orden");
const btnCerrarModal = document.getElementById("btn-cerrar-modal");
const btnCancelar = document.getElementById("btn-cancelar");
const formOrden = document.getElementById("form-orden");

const filtroEstado = document.getElementById("filtro-estado");
const inputCliente = document.getElementById("input-cliente");
const inputBici = document.getElementById("input-bici");
const inputProblema = document.getElementById("input-problema");

// Inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
  cargarOrdenes();

  // Eventos para abrir/cerrar modal
  btnNuevaOrden.addEventListener("click", () => modal.style.display = "flex");
  btnCerrarModal.addEventListener("click", () => modal.style.display = "none");
  btnCancelar.addEventListener("click", () => modal.style.display = "none");

  // Evento enviar formulario
  formOrden.addEventListener("submit", guardarNuevaOrden);

  // Eventos de filtro
  filtroEstado.addEventListener("change", cargarOrdenes);
  inputCliente.addEventListener("input", debounce(cargarOrdenes, 300));
  inputBici.addEventListener("input", debounce(cargarOrdenes, 300));
  inputProblema.addEventListener("input", debounce(cargarOrdenes, 300));
});

// Función debounce para evitar peticiones excesivas mientras el usuario escribe
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 1. Cargar órdenes consultando al Backend en FastAPI con los filtros separados
async function cargarOrdenes() {
  try {
    const estado = filtroEstado.value;
    const cliente = inputCliente.value.trim();
    const bici = inputBici.value.trim();
    const problema = inputProblema.value.trim();
    const params = new URLSearchParams();
    if (estado) params.append("estado", estado);
    if (cliente) params.append("codigo_cliente", cliente);
    if (bici) params.append("bici", bici);
    if (problema) params.append("problema", problema);

    const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;

    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error("Error al consultar las órdenes.");
    
    ordenesGlobales = await respuesta.json();
    renderizarOrdenes();
  } catch (error) {
    console.error("Error:", error);
    alert("No se pudieron cargar las órdenes. ¿Está el servidor corriendo?");
  }
}

// 2. Renderizar tarjetas directamente en las columnas del Kanban
function renderizarOrdenes() {
  const listaPendiente = document.getElementById("lista-pendiente");
  const listaEnReparacion = document.getElementById("lista-en-reparacion");
  const listaTerminada = document.getElementById("lista-terminada");

  // Limpiar contenedores
  listaPendiente.innerHTML = "";
  listaEnReparacion.innerHTML = "";
  listaTerminada.innerHTML = "";

  // Contadores
  let cantPendiente = 0, cantReparacion = 0, cantTerminada = 0;

  ordenesGlobales.forEach(orden => {
    const tarjetaHtml = crearTarjetaHTML(orden);

    if (orden.estado === "Pendiente") {
      listaPendiente.insertAdjacentHTML("beforeend", tarjetaHtml);
      cantPendiente++;
    } else if (orden.estado === "En reparación") {
      listaEnReparacion.insertAdjacentHTML("beforeend", tarjetaHtml);
      cantReparacion++;
    } else if (orden.estado === "Terminada") {
      listaTerminada.insertAdjacentHTML("beforeend", tarjetaHtml);
      cantTerminada++;
    }
  });

  // Actualizar badges
  document.getElementById("badge-pendiente").textContent = cantPendiente;
  document.getElementById("badge-en-reparacion").textContent = cantReparacion;
  document.getElementById("badge-terminada").textContent = cantTerminada;
}

// 3. Crear HTML de cada tarjeta
function crearTarjetaHTML(orden) {
  let botonesAccion = "";

  if (orden.estado === "Pendiente") {
    botonesAccion = `<button class="btn-action" onclick="cambiarEstadoOrden('${orden.id}', 'En reparación')">▶ Empezar</button>`;
  } else if (orden.estado === "En reparación") {
    botonesAccion = `
      <button class="btn-action" onclick="cambiarEstadoOrden('${orden.id}', 'Pendiente')">◀ Volver</button>
      <button class="btn-action" onclick="cambiarEstadoOrden('${orden.id}', 'Terminada')">✔ Terminar</button>
    `;
  } else if (orden.estado === "Terminada") {
    botonesAccion = `<button class="btn-action" onclick="cambiarEstadoOrden('${orden.id}', 'En reparación')">◀ Reabrir</button>`;
  }

  return `
    <div class="card">
      <div class="card-header">
        <span>Cliente: <strong>${orden.codigo_cliente}</strong></span>
      </div>
      <div class="card-title">${orden.descripcion_bici}</div>
      <div class="card-body">${orden.problema}</div>
      <div class="card-actions">
        ${botonesAccion}
      </div>
    </div>
  `;
}

// 4. Crear nueva orden (POST)
async function guardarNuevaOrden(evento) {
  evento.preventDefault();

  const nuevaOrden = {
    codigo_cliente: document.getElementById("codigo_cliente").value.trim(),
    descripcion_bici: document.getElementById("descripcion_bici").value.trim(),
    problema: document.getElementById("problema").value.trim(),
    estado: "Pendiente"
  };

  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaOrden)
    });

    if (!respuesta.ok) throw new Error("Error al guardar la orden.");

    // Resetear formulario y cerrar modal
    formOrden.reset();
    modal.style.display = "none";

    cargarOrdenes();
  } catch (error) {
    console.error("Error:", error);
    alert("No se pudo crear la orden.");
  }
}

// 5. Cambiar el estado de una orden (PATCH)
async function cambiarEstadoOrden(id, nuevoEstado) {
  try {
    const respuesta = await fetch(`${API_URL}/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (!respuesta.ok) throw new Error("Error al actualizar el estado.");

    cargarOrdenes();
  } catch (error) {
    console.error("Error:", error);
    alert("No se pudo actualizar el estado de la orden.");
  }
}