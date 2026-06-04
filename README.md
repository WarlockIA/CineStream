# CineStream - Plataforma de Gestión de Cine

CineStream es un sistema integral de **Business Intelligence, Venta de Boletos y Punto de Venta (POS)** diseñado para administrar salas de cine modernas. Construido con una arquitectura Fullstack (React + Node.js + PostgreSQL), el sistema incluye validaciones de concurrencia en tiempo real (Sockets), pasarelas de pago (QR / Tarjetas) y un dashboard estadístico robusto.

---

## 🚀 Arquitectura y Stack Tecnológico

- **Frontend:** React 18, Vite, React Router, Recharts, TailwindCSS, Lucide-React.
- **Backend:** Node.js, Express, Sequelize (ORM), Socket.io.
- **Base de Datos:** PostgreSQL (con modelos transaccionales).
- **Seguridad:** JWT, Helmet, XSS-Clean, Bcrypt, Control de Roles Estricto (Admin, Staff, Cliente, Portero).
- **Performance:** Code Splitting (`React.lazy`), Optimización nativa de imágenes, Consultas SQL Avanzadas en backend.

---

## 📋 Requisitos del Sistema

- **Node.js:** v18.0.0 o superior.
- **NPM / Yarn:** Gestor de paquetes actualizado.
- **PostgreSQL:** v14 o superior.

---

## 🛠 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-organizacion/cinestream.git
cd CineStream
```

### 2. Configuración del Backend
1. Navega a la carpeta del backend e instala las dependencias:
   ```bash
   cd backend
   npm install
   ```
2. Renombra `.env.example` a `.env` y configura tus variables de entorno (Base de datos y JWT Secret).
3. Asegúrate de que tu servicio PostgreSQL esté corriendo.
4. Levanta el servidor en modo desarrollo (esto sincronizará la BD y sembrará los Snacks iniciales):
   ```bash
   npm run dev
   ```

### 3. Configuración del Frontend
1. En una nueva terminal, navega a la carpeta del frontend e instala dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Levanta el cliente de React:
   ```bash
   npm run dev
   ```

---

## 🛡 Roles y Accesos (Testing E2E)

Al iniciar la base de datos por primera vez (o al registrar manualmente), puedes probar estos perfiles:

- **Admin:** Acceso total al Dashboard, Inventario y Cartelera.
- **Staff (Taquilla):** Acceso al POS (`/pos`) para ventas en efectivo y arqueo de caja.
- **Cliente:** Acceso a compras web, selección de asientos y código QR.
- **Portero:** Acceso a la validación de boletos escaneando el código QR.

---

## 🧪 Pruebas E2E (Flujo Principal)

1. **Venta Web (Cliente)**
   - Inicia sesión como cliente.
   - Navega a Cartelera, selecciona una función y elige 2 asientos.
   - Avanza a Dulcería y añade 1 pipoca.
   - Confirma el pago simulado. Se generará tu ticket con un **Código QR**.
2. **Validación de Acceso (Portero)**
   - Abre una ventana en incógnito e inicia sesión como `porter`.
   - Navega a `/portero`. Simula el escaneo pegando el "Transaction ID" de tu ticket. El sistema debe marcarlo como *Válido* y consumirlo.
3. **Punto de Venta (Taquilla / Staff)**
   - Inicia sesión como `staff`.
   - Navega a `/pos`. Asegúrate de tener un Turno Abierto (o ábrelo).
   - Registra una venta rápidamente. Observa cómo los asientos reservados previamente aparecen bloqueados en rojo (o gris oscuro) gracias a WebSockets.
4. **Inteligencia de Negocios (Admin)**
   - Inicia sesión como `admin`.
   - Navega al **Dashboard**. Visualiza la comparativa de la venta web que hiciste vs la venta física, y valida el ranking del personal.

---

## 🔒 Hardening y Seguridad

- **XSS y SQLi:** El backend previene la inyección SQL a través de `Sequelize` y bloquea scripts maliciosos con `xss-clean`.
- **Headers:** `helmet` protege contra clickjacking y restringe orígenes cruzados no seguros.
- **ErrorBoundary:** El frontend captura cualquier colapso de UI (React Crash) y muestra una pantalla amigable de recuperación, asegurando que la interfaz de ventas (POS) sea inquebrantable.

---
**Desarrollado con ❤️ para CineStream - Sprint Final V1.0**
