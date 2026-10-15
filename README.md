# Taller de Bicicletas

Aplicación Web Full-Stack para gestionar órdenes de trabajo en un taller de bicicletas mediante un tablero Kanban.

## Tecnologías

- **Backend:** Python 3 + FastAPI + Pydantic
- **Base de Datos:** MongoDB Atlas (`pymongo`)
- **Frontend:** Vanilla JS, HTML5, CSS3

## Instalación y Ejecución

1. **Clonar repositorio:**
   ```bash
   git clone https://github.com/adrianrc7/taller-bicicletas
   cd taller-bicicletas

2. **Entorno virtual e intalación**
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   pip install -r requirements.txt

3. **Variables de entorno:**

   Copia `.env.example` a `.env` y define tu URI de conexión:
   ```bash
   cp .env.example .env

4. **Arrancar backend:**
   uvicorn main:app --reload

   - App: http://127.0.0.1:8000
   - Documentación Swagger UI: http://127.0.0.1:8000/docs

---

## Decisiones de Diseño

- **Modelado de Datos con Pydantic:** Se utiliza Pydantic para definir los esquemas de entrada y salida, reduciendo significativamente el código repetitivo (*boilerplate*) y asegurando la validación automática de tipos y datos requeridos en los endpoints de FastAPI.
- **Búsqueda Avanzada en Backend:** Se optó por realizar las consultas directamente desde el backend mediante *Query Parameters*. Para el `codigo_cliente` se aplica coincidencia exacta para evitar ambigüedades, mientras que para la `descripcion_bici` y el `problema` se utilizan búsquedas por coincidencias parciales (`$regex` *case-insensitive*), permitiendo encontrar averías o modelos específicos rápidamente.
- **Interfaz Kanban e Integridad del Flujo:** Diseño organizado en columnas según el `estado` de la reparación. Esta disposición permite visualizar los cambios de manera clara mediante peticiones `PATCH` y garantiza la regla de negocio: no es posible pasar una orden de "Pendiente" a "Terminada" sin haber pasado previamente por "En reparación", asegurando así el ciclo de trabajo correcto.
- **Búsqueda Automática en Tiempo Real:** Al tratarse de un prototipo orientado a un volumen moderado de órdenes, se eliminó el botón manual de envío (*submit*) para ofrecer una experiencia de usuario más fluida e instantánea.
- **Optimización de Interfaz con Debounce:** Control de peticiones desde el cliente aplicando una función `debounce` (300 ms) en los inputs de texto, evitando llamadas excesivas al backend y a MongoDB Atlas a medida que el usuario escribe.

## Comprobaciones Realizadas

- **Pruebas Manuales de Flujo Completo:** Creación manual de múltiples órdenes de reparación desde la interfaz web y Swagger UI, comprobando el cambio progresivo de estado (Pendiente → En reparación → Terminada) y verificando la actualización dinámica en las tarjetas Kanban.
- **Validación de API REST:** Comprobación de esquemas y respuesta de los endpoints (`POST`, `GET`, `PATCH`) mediante la interfaz interactiva de Swagger UI (`/docs`).
- **Persistencia en la Nube:** Verificación del almacenamiento, consulta y modificación en tiempo real de los documentos dentro de la colección en MongoDB Atlas.
- **Seguridad de Datos:** Aislamiento de variables de entorno y claves privadas en el archivo `.env`, omitido del control de versiones mediante `.gitignore`.

## Futuras Mejoras

- **Autenticación y Roles de Usuario (JWT + RBAC):** Suponiendo la incorporación futura de usuarios en el sistema, implementar autenticación mediante tokens JWT y control de acceso basado en roles (RBAC) para diferenciar permisos entre perfiles (por ejemplo, recepcionistas que gestionan clientes/órdenes y mecánicos que únicamente actualizan estados).
- **RGPD & Aislamiento de Datos:** Separar la colección de datos personales de los clientes de la colección de `ordenes` técnicas, restringiendo la visibilidad de los datos sensibles según el rol del usuario.
- **Escalabilidad:** Implementar paginación (`limit` / `skip`) en los endpoints de lectura para mantener un rendimiento óptimo ante un alto volumen de registros.
