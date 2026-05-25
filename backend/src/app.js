import { createServer } from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { authRoutes } from './routes/auth.route.js';
import { stationsRoutes } from './routes/stations.route.js';
import { alertsRoutes } from './routes/alerts.route.js';
import { reportsRoutes } from './routes/reports.route.js';
import { aiRoutes } from './routes/ai.route.js';
import { weatherRoutes } from './routes/weather.route.js';
import { adminRoutes } from './routes/admin.route.js';
import { notificationsRoutes } from './routes/notifications.route.js';
import { activityRoutes } from './routes/activity.route.js';
import { healthRoutes } from './routes/health.route.js';

import { conexionBD } from './data/db.js';
import { seedStationMeta } from './data/seedStationMeta.js';
import { AlertConfig } from './models/alertConfig.model.js';
import { iniciarJobs } from './jobs/index.js';
import { iniciarSockets } from './sockets/index.js';
import { swaggerSpec } from './config/swagger.js';
import { PORT, FRONTEND_URL, NODE_ENV, SWAGGER_ENABLED } from './config.js';

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

// ── Swagger (solo en desarrollo o con SWAGGER_ENABLED=true) ───────────────
if (NODE_ENV !== 'production' || SWAGGER_ENABLED === 'true') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Horizonte Verde Digital — API Docs',
        customCss: '.swagger-ui .topbar { background: #166534; } .swagger-ui .topbar-wrapper img { display: none; } .swagger-ui .topbar-wrapper::before { content: "🌱 Horizonte Verde Digital"; color: white; font-size: 18px; font-weight: 700; }'
    }));
    console.log(`Swagger disponible en http://localhost:${PORT}/api/docs`);
}

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/health', healthRoutes);

// ── Salud del servidor ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'Horizonte Verde Digital — API REST activa' });
});

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// ── Error handler global ───────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    // _next is unused but kept in the signature so Express recognizes this as
    // an error-handling middleware (must have 4 args). Prefixing with _
    // avoids unused-parameter diagnostics.
    const status = err.status ?? err.statusCode ?? 500;
    const message = NODE_ENV === 'production' ? 'Error interno del servidor' : (err.message ?? 'Error desconocido');
    res.status(status).json({ message });
});

// ── Arranque ───────────────────────────────────────────────────────────────
const httpServer = createServer(app);

conexionBD()
    .then(async () => {
        // Migración: eliminar AlertConfigs con métricas en formato antiguo (pre-dinámico)
        const METRICAS_ANTIGUAS = ['temperature', 'humidity', 'vwc', 'battery', 'connection'];
        const { deletedCount } = await AlertConfig.deleteMany({ metric: { $in: METRICAS_ANTIGUAS } });
        if (deletedCount > 0) {
            console.log(`[Migración] ${deletedCount} AlertConfig(s) con formato antiguo eliminada(s). Reconfigura los umbrales desde la interfaz.`);
        }

        await seedStationMeta();
        iniciarSockets(httpServer);
        iniciarJobs();
        // Manejar errores del servidor (p. ej. EADDRINUSE) para evitar
        // que se emita un 'error' no manejado y el proceso se caiga sin
        // información clara.
        httpServer.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE') {
                console.error(`No se puede iniciar el servidor: el puerto ${PORT} está en uso.`);
                console.error('Causa: EADDRINUSE. Detén el proceso que usa el puerto o cambia la variable PORT.');
                process.exit(1);
            }
            console.error('Error en el servidor HTTP:', err);
            process.exit(1);
        });

        httpServer.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('No se pudo iniciar el servidor:', err.message);
        process.exit(1);
    });
