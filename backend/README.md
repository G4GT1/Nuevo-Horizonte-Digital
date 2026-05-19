# Horizonte Verde Digital — Backend

Plataforma unificada de gestión de sensores agrícolas para el IES Galileo Galilei (Córdoba, España).
Integra FieldClimate (GSM) y Cesens (LoRa) en una sola interfaz moderna.

## Stack

- **Runtime**: Node.js 20 + Express 5
- **Base de datos**: MongoDB Atlas + Mongoose
- **Auth**: JWT (access + refresh) + bcrypt
- **Emails**: Resend
- **Seguridad**: helmet + cors + express-rate-limit + express-validator
- **Jobs**: node-cron
- **Push**: web-push
- **IA**: Groq API (Llama 3.3-70b)

## Instalación

```bash
npm install
cp .env.example .env
# Editar .env con tus credenciales reales
```

### Generar claves VAPID para Web Push

```bash
npx web-push generate-vapid-keys
```

Copia las claves generadas en `.env` (`VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`).

## Arranque

```bash
npm run dev   # desarrollo con nodemon
npm start     # producción
```

## Estructura

```
src/
├── app.js                  # Entrada: Express + middlewares + rutas
├── config.js               # Variables de entorno
├── data/
│   └── db.js               # Conexión MongoDB (singleton)
├── models/
│   ├── user.model.js
│   ├── alertConfig.model.js
│   ├── alert.model.js
│   └── pushSubscription.model.js
├── services/               # Clientes de APIs externas
│   ├── fieldclimate.service.js
│   ├── cesens.service.js
│   ├── openmeteo.service.js
│   ├── groq.service.js
│   ├── email.service.js
│   └── push.service.js
├── controllers/
├── routes/
├── middlewares/
│   └── auth.middleware.js  # JWT + RBAC
├── validators/             # express-validator
└── jobs/                   # node-cron
    ├── alertas.job.js      # Cada 15 min
    ├── resumenSemanal.job.js # Lunes 08:00
    └── index.js
```

## Rutas principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro + email verificación |
| POST | `/api/auth/login` | Login + JWT |
| GET | `/api/auth/verify/:token` | Verificar email |
| GET | `/api/stations` | Todas las estaciones (FC + Cesens) |
| GET | `/api/stations/:id/data` | Datos actuales |
| GET | `/api/stations/:id/history` | Histórico con rango |
| GET/POST | `/api/alerts` | Alertas y configuración de umbrales |
| GET | `/api/reports/export/pdf` | Exportar PDF |
| GET | `/api/reports/export/excel` | Exportar Excel |
| POST | `/api/ai/chat` | Chatbot (Groq) |
| POST | `/api/ai/search` | Buscador IA con datos reales |
| GET | `/api/weather` | Predicción Open-Meteo |
