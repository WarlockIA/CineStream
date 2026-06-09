# 🚀 Guía de Despliegue en Vercel

## Resumen de Configuración

Tu proyecto CineStream está ahora configurado para usar **variables de entorno** en lugar de URLs hardcodeadas. Esto permite que funcione en desarrollo, staging y producción sin cambios de código.

---

## ✅ Lo que ya configuramos

### 1. **Archivo de configuración centralizada** (`frontend/src/config/api.js`)
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
```

### 2. **Archivos de ambiente**
- **`.env.example`** - Plantilla de ejemplo (comitea en Git)
- **`.env.local`** - Configuración local (NO comitea en Git - ya está en .gitignore)
- **`.env.production`** - Configuración para producción en Vercel

### 3. **Componentes actualizados** (10 archivos principales)
Todos los componentes ahora usan:
- `getAPIUrl('/endpoint')` en lugar de `'http://localhost:3000/endpoint'`
- `getImageUrl(path)` para imágenes
- `SOCKET_URL` para conexiones WebSocket

---

## 🛠 Pasos para desplegar

### **Paso 1: Configura tu backend en Railway (o similar)**

1. Ve a https://railway.app
2. Crea una nueva cuenta
3. Conecta tu repositorio Git
4. Crea un nuevo proyecto con `backend/package.json`
5. **Nota la URL de Railway** (ej: `https://tu-backend-railway.up.railway.app`)

> ⚠️ **Asegúrate de**:
> - Base de datos PostgreSQL configurada
> - Variables de entorno en Railway (PORT, DATABASE_URL, JWT_SECRET, etc.)

---

### **Paso 2: Actualiza `.env.production`**

En `frontend/.env.production`, reemplaza:

```bash
# ANTES
VITE_API_URL=https://tu-backend-railway.up.railway.app
VITE_SOCKET_URL=https://tu-backend-railway.up.railway.app

# DESPUÉS - con tu URL real
VITE_API_URL=https://cinestream-backend-production.up.railway.app
VITE_SOCKET_URL=https://cinestream-backend-production.up.railway.app
```

---

### **Paso 3: Configura Vercel**

#### **Opción A: Mediante Vercel CLI**
```bash
cd frontend
npm install -g vercel
vercel login
vercel deploy
```

#### **Opción B: Mediante Dashboard de Vercel**
1. Ve a https://vercel.com
2. Haz click en "Add New" → "Project"
3. Conecta tu repositorio GitHub
4. Selecciona la carpeta `frontend`
5. Click en "Deploy"

---

### **Paso 4: Configura variables de entorno en Vercel**

En Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL = https://tu-backend-railway.up.railway.app
VITE_SOCKET_URL = https://tu-backend-railway.up.railway.app
```

> 💡 **Vercel automáticamente lee `.env.production`**, pero es mejor configurarlas en el dashboard para seguridad.

---

### **Paso 5: Redeploy automático** (Opcional)

1. En Vercel → Settings → Git
2. Selecciona la rama principal (main/master)
3. Cada push automáticamente redespliega

---

## 🧪 Testing local

### **En desarrollo (con backend local)**

```bash
cd frontend
npm run dev
```

Automáticamente usará `http://localhost:3000` de `.env.local`

### **Simular producción local**

```bash
# Build
npm run build

# Preview
npm run preview
```

---

## 📋 Checklist antes de ir a producción

- [ ] Backend corriendo en Railway con BASE_URL configurado
- [ ] `.env.production` actualizado con URLs reales
- [ ] Variables de entorno configuradas en Vercel Dashboard
- [ ] `node_modules` y `dist` están en `.gitignore`
- [ ] `.env` y `.env.local` están en `.gitignore`
- [ ] Haz un commit y push
- [ ] Verifica que el build de Vercel sea exitoso (ver Deployments → Details)

---

## 🔧 Troubleshooting

### Error: "Cannot fetch from localhost:3000"
✅ **Solución**: Verifica que `VITE_API_URL` esté configurada en Vercel

### Error: "404 from API"
✅ **Solución**: Comprueba que tu backend está activo en Railway

### Socket.io not connecting
✅ **Solución**: Asegúrate que `VITE_SOCKET_URL` sea la URL de tu backend Railway

### Build falla con "variable no definida"
✅ **Solución**: Todas las variables deben empezar con `VITE_` para ser accesibles en Vite

---

## 📚 Documentación adicional

- [Vite Environment Variables](https://vite.dev/guide/env-and-modes.html)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Railway App Deployment](https://railway.app/docs)

---

## ❓ Preguntas frecuentes

**P: ¿Por qué usar variables de entorno?**
R: Permite que el mismo código funcione en desarrollo, staging y producción sin cambios.

**P: ¿Y si quiero cambiar la URL sin redeploy?**
R: En Vercel, actualiza las Environment Variables y haz un redeploy. En Railway, edita las variables y redeploy también.

**P: ¿Puedo usar HTTPS con localhost?**
R: No es necesario para desarrollo. En producción (Vercel + Railway), ambos usan HTTPS automáticamente.

---

✅ **¡Listo para desplegar!** 🚀
