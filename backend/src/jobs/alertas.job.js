import cron from 'node-cron';
import { AlertConfig } from '../models/alertConfig.model.js';
import { Alert } from '../models/alert.model.js';
import { User } from '../models/user.model.js';
import { PushSubscription } from '../models/pushSubscription.model.js';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { enviarEmailAlertaCritica } from '../services/email.service.js';
import { enviarNotificacionATodos } from '../services/push.service.js';
import { crearNotificacion } from '../utils/notificaciones.js';
import { emitirActualizacionSensor, emitirAlertaNueva } from '../sockets/index.js';

const CESENS_ID_ESTACION = 8368;
const CESENS_METRICAS = { temperature: 1, humidity: 6, vwc: 28, battery: 95 };

const obtenerValorActual = async (config) => {
    if (config.source === 'fieldclimate') {
        const datos = await fieldclimate.obtenerUltimaDatosEstacion(config.stationId);
        const sensor = datos?.sensors?.find(s => s.name?.toLowerCase().includes(config.metric));
        return sensor?.values?.[0]?.value ?? null;
    }

    if (config.source === 'cesens') {
        const idMetrica = CESENS_METRICAS[config.metric];
        if (!idMetrica) return null;
        const hoy = new Date();
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        const datos = await cesens.obtenerDatosMetrica(CESENS_ID_ESTACION, idMetrica, ayer, hoy);
        const lecturas = Array.isArray(datos) ? datos : [];
        return lecturas.length ? lecturas[lecturas.length - 1]?.value ?? null : null;
    }

    return null;
};

const evaluarUmbral = (valor, operator, threshold) => {
    if (operator === 'gt') return valor > threshold;
    if (operator === 'lt') return valor < threshold;
    if (operator === 'eq') return valor === threshold;
    return false;
};

const construirMensaje = (config, valor) => {
    const ops = { gt: 'supera', lt: 'está por debajo de', eq: 'es igual a' };
    return `${config.metric} ${ops[config.operator]} el umbral (${valor} vs ${config.threshold}) en la estación ${config.stationId}.`;
};

const comprobarAlertas = async () => {
    console.log(`[${new Date().toISOString()}] Comprobando alertas...`);

    try {
        const configs = await AlertConfig.find({ active: true });
        if (!configs.length) return;

        // Mapa para agrupar valores por estación y emitir sensor:update una sola vez por estación
        const valoresPorEstacion = new Map();

        for (const config of configs) {
            try {
                const valor = await obtenerValorActual(config);
                if (valor === null) continue;

                // Acumular datos para el evento sensor:update
                if (!valoresPorEstacion.has(config.stationId)) {
                    valoresPorEstacion.set(config.stationId, {
                        stationId: config.stationId,
                        source: config.source,
                        timestamp: new Date().toISOString(),
                        datos: {}
                    });
                }
                valoresPorEstacion.get(config.stationId).datos[config.metric] = valor;

                const umbralSuperado = evaluarUmbral(valor, config.operator, config.threshold);
                if (!umbralSuperado) continue;

                // Evitar duplicar alertas activas para la misma config
                const alertaActiva = await Alert.findOne({
                    userId: config.userId,
                    stationId: config.stationId,
                    metric: config.metric,
                    status: 'active'
                });
                if (alertaActiva) continue;

                const mensaje = construirMensaje(config, valor);
                const tipo = config.metric === 'battery' || config.metric === 'connection' ? 'critical' : 'warning';

                const alerta = await Alert.create({
                    userId: config.userId,
                    stationId: config.stationId,
                    stationName: config.stationId,
                    type: tipo,
                    metric: config.metric,
                    value: valor,
                    threshold: config.threshold,
                    message: mensaje
                });

                // Notificación interna
                await crearNotificacion(
                    config.userId,
                    tipo === 'critical' ? 'alerta_critica' : 'alerta_sensor',
                    `⚠️ Alerta en ${config.stationId}`,
                    mensaje,
                    '/alertas'
                );

                // Emitir alerta por socket al usuario + superadmin
                emitirAlertaNueva(config.userId, {
                    id: alerta._id,
                    tipo,
                    estacion: config.stationId,
                    metrica: config.metric,
                    valor,
                    umbral: config.threshold,
                    mensaje
                });

                // Push al navegador
                const suscripciones = await PushSubscription.find({ userId: config.userId });
                if (suscripciones.length) {
                    await enviarNotificacionATodos(suscripciones, {
                        title: `⚠️ Alerta: ${config.metric}`,
                        body: mensaje,
                        data: { alertaId: alerta._id, url: '/alertas' }
                    });
                }

                // Email si es crítica y el usuario lo tiene activado
                if (tipo === 'critical') {
                    const usuario = await User.findById(config.userId).select('email nombre notifications preferences');
                    if (usuario?.notifications?.emailCritical) {
                        await enviarEmailAlertaCritica(usuario.email, usuario.nombre, {
                            stationName: config.stationId,
                            metric: config.metric,
                            value: valor,
                            threshold: config.threshold,
                            message: mensaje
                        }, usuario.preferences?.language);
                    }
                }

            } catch (errorConfig) {
                console.error(`[Alertas] Error procesando config ${config._id}:`, errorConfig.message);
            }
        }

        // Emitir actualizaciones de sensor a todos los conectados
        for (const datos of valoresPorEstacion.values()) {
            emitirActualizacionSensor(datos);
        }

    } catch (error) {
        console.error('[Alertas] Error general en el job:', error.message);
    }
};

export const iniciarJobAlertas = () => {
    cron.schedule('*/15 * * * *', comprobarAlertas, { timezone: 'Europe/Madrid' });
    console.log('Job de alertas iniciado — cada 15 minutos');
};
