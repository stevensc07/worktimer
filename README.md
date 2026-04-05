# Work Timer App (PWA) - Construcción

Código base full-stack para control de asistencia, ubicación GPS y evidencias fotográficas en obra.

## Stack
- Frontend: React (Hooks) + PWA (Service Worker + Manifest)
- Backend: Node.js + Express
- DB: MongoDB + Mongoose
- Evidencias: Google Drive API v3 (Service Account)

## Estructura
- `server/`: API REST, autenticación JWT, modelos Mongoose, lógica de negocio.
- `client/`: App React PWA para móviles y escritorio.

---

## 1) Configuración Google Drive API (Service Account)

### Pasos rápidos en Google Cloud Console
1. Crear proyecto en Google Cloud.
2. Habilitar **Google Drive API** en `APIs & Services > Library`.
3. Crear una **Service Account** en `IAM & Admin > Service Accounts`.
4. En la Service Account, generar clave tipo **JSON** y descargar archivo.
5. Compartir la carpeta de Drive destino con el correo de la Service Account (permiso Editor).
6. Copiar el `Folder ID` de Drive en `GOOGLE_DRIVE_FOLDER_ID`.

### Configuración en backend
- Opción A: usar archivo JSON con `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`.
- Opción B: usar JSON inline con `GOOGLE_SERVICE_ACCOUNT_JSON`.

Implementación principal:
- Servicio: `server/src/services/googleDriveService.js`
- Función: `uploadToDrive(imageBuffer, { fileName, mimeType, folderId })`
- Retorna: `{ fileId, webViewLink, webContentLink }`

---

## 2) Modelos Mongoose

- `User` (`server/src/models/User.js`)
  - `employeeId`, `name`, `role` (`OBRERO`/`SUPERVISOR`), `passwordHash`.
- `WorkSession` (`server/src/models/WorkSession.js`)
  - `workerId`, `startTime`, `endTime`, `durationMinutes`,
  - `checkInLocation` y `checkOutLocation` en formato GeoJSON (`Point`),
  - `activityPhotoFileIds` para referencias de evidencia por sesión.
- `Task` (`server/src/models/Task.js`)
  - `workerId`, `workSessionId`, `description`, `status`, `googleDriveFileIds`.

---

## 3) Backend - Lógica y Endpoints

### Seguridad JWT
- Middleware: `server/src/middleware/authMiddleware.js`
- Header requerido: `Authorization: Bearer <token>`

### Endpoints clave
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/attendance/check-in`
- `POST /api/attendance/check-out`
- `GET /api/attendance/current`
- `POST /api/activities/upload-activity-photo` (con `multer.memoryStorage`)
- `GET /api/metrics/hours?workerId=<id>` (solo supervisor)
- `POST /api/tasks`
- `GET /api/tasks/me`
- `PATCH /api/tasks/:id/status`

### Reglas implementadas
- Check-out calcula automáticamente `durationMinutes`.
- Upload de foto:
  1. recibe `photo` (multipart/form-data),
  2. sube a Drive con `uploadToDrive`,
  3. guarda `fileId` en `Task.googleDriveFileIds` o `WorkSession.activityPhotoFileIds`.
- Métricas por agregación MongoDB:
  - semanal (`$dateTrunc` por semana),
  - mensual (`$dateTrunc` por mes),
  - suma total de minutos/horas por empleado.

### Manejo de errores
- Middleware global: `server/src/middleware/errorHandler.js`
- Logging: `server/src/utils/logger.js`
- Si Drive falla: responde mensaje amigable y log estructurado.

---

## 4) Frontend React PWA

### Componentes principales
- `AttendanceAction` (`client/src/components/AttendanceAction.jsx`)
  - Botones táctiles grandes para Check-in/Check-out.
  - Captura ubicación con `navigator.geolocation`.
- `CaptureEvidence` (`client/src/components/CaptureEvidence.jsx`)
  - Usa `<input type="file" accept="image/*" capture="environment" />`.
  - Sube evidencia al backend vía `FormData`.

### Flujo UI
1. Login con ID de empleado y PIN.
2. Dashboard con estado de jornada activa.
3. Check-in/out con GPS.
4. Captura y envío de foto de hallazgo.

---

## 5) PWA - Instalación y manifest

### Manifest
Archivo: `client/public/manifest.json`

Campos clave configurados:
- `name` / `short_name`
- `display: "standalone"`
- `start_url`, `scope`
- `theme_color`, `background_color`
- `icons` (192 y 512)

### Service Worker
Archivo: `client/public/service-worker.js`
- Cache del shell principal.
- Fallback offline para UI.
- Exclusión de llamadas API para no cachear respuestas dinámicas.

En frontend se registra en:
- `client/src/utils/registerServiceWorker.js`
- invocado desde `client/src/main.jsx`.

---

## Variables de entorno

### Backend (`server/.env`)
Usar como base `server/.env.example`.

Variables mínimas:
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_DRIVE_FOLDER_ID`
- (`GOOGLE_SERVICE_ACCOUNT_KEY_PATH` o `GOOGLE_SERVICE_ACCOUNT_JSON`)

### Frontend (`client/.env`)
Usar como base `client/.env.example`.

- `VITE_API_BASE_URL=http://localhost:5000/api`

---

## Ejecución local

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

---

## Notas de arquitectura
- Diseño modular por responsabilidad (config, servicios, controladores, rutas, middleware).
- Principios SOLID aplicados en separación de capas.
- Preparado para evolucionar a colas de procesamiento, auditoría y notificaciones sin romper contratos actuales.
# worktimer
