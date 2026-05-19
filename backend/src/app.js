import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth.route.js';
import { stationsRoutes } from './routes/stations.route.js';
import { alertsRoutes } from './routes/alerts.route.js';
import { reportsRoutes } from './routes/reports.route.js';
import { aiRoutes } from './routes/ai.route.js';
import { pushRoutes } from './routes/push.route.js';
import { weatherRoutes } from './routes/weather.route.js';
import { adminRoutes } from './routes/admin.route.js';
import { notificationsRoutes } from './routes/notifications.route.js';
import { activityRoutes } from './routes/activity.route.js';

import { conexionBD } from './data/db.js';
import { iniciarJobs } from './jobs/index.js';
import { PORT, FRONTEND_URL } from './config.js';

const app = express();

// ── Seguridad ──────────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
    origin: FRONTEND_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

const limitadorGeneral = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' }
});

const limitadorAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' }
});

app.use(limitadorGeneral);
app.use('/api/auth', limitadorAuth);

// ── Parsers ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activity', activityRoutes);

// ── Salud del servidor ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'Horizonte Verde Digital — API REST activa' });
});

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// ── Arranque ───────────────────────────────────────────────────────────────
conexionBD()
    .then(() => {
        iniciarJobs();
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('No se pudo iniciar el servidor:', err.message);
        process.exit(1);
    });
