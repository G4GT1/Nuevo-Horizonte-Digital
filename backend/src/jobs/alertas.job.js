import cron from 'node-cron';
import { AlertConfig } from '../models/alertConfig.model.js';
import { Alert } from '../models/alert.model.js';
import { User } from '../models/user.model.js';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { enviarEmailAlertaCritica } from '../services/email.service.js';
import { crearNotificacion } from '../utils/notificaciones.js';
import { emitirActualizacionSensor, emitirAlertaNueva, emitirNotificacionNueva } from '../sockets/index.js';

// ── Obtención de datos con caché por estación (scoped a cada ejecución) ─────
// Evita N llamadas a la API cuando varias AlertConfig usan la misma estación.

const obtenerDatosEstacion = async (source, stationId, cache) => {
    const key = `${source}:${stationId}`;
    if (cache.has(key)) return cache.get(key);

    const datos = source === 'fieldclimate'
        ? await fieldclimate.obtenerUltimaDatosEstacion(stationId)
        : await cesens.obtenerUltimaLecturaEstacion(stationId);

    cache.set(key, datos);
    return datos;
};

// ── Obtención del valor actual para un AlertConfig ───────────────────────────
// config.metric es el nombreOriginal exacto del sensor (guardado al crear el umbral)

const obtenerValorActual = async (config, cache) => {
    const datos = await obtenerDatosEstacion(config.source, config.stationId, cache);
    const todas = [...(datos?.principal ?? []), ...(datos?.detalle ?? [])];

    // Match exacto por nombreOriginal — sin regex, sin traducciones
    const match = todas.find(m => m.nombreOriginal === config.metric);
    const valor  = match?.valor ?? null;

    console.log(
        `[Alertas][${config.source.toUpperCase()}] config=${config._id}` +
        ` métrica="${config.metric}"` +
        ` → ${match ? `"${match.nombre}" = ${valor} ${match.unidad ?? ''}` : 'SIN COINCIDENCIA'}`
    );

    if (!match && todas.length > 0) {
        console.warn(
            `[Alertas] Nombres disponibles en estación ${config.stationId}:`,
            todas.map(m => `"${m.nombreOriginal}"`).join(', ')
        );
    }

    return valor;
};

// ── Evaluación de umbral ─────────────────────────────────────────────────────

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

// ── Job principal ────────────────────────────────────────────────────────────

export const comprobarAlertas = async () => {
    console.log(`\n[${new Date().toISOString()}] ── Iniciando comprobación de alertas ──`);

    // Caché local a esta ejecución — evita duplicar peticiones por estación
    const cacheEstaciones = new Map();
    let alertasGeneradas = 0;

    try {
        const configs = await AlertConfig.find({ active: true });
        console.log(`[Alertas] ${configs.length} configuración(es) activa(s)`);
        if (!configs.length) return { alertasGeneradas: 0 };

        const valoresPorEstacion = new Map();

        for (const config of configs) {
            try {
                console.log(
                    `\n[Alertas] ── Config ${config._id}: source=${config.source}` +
                    ` station=${config.stationId} métrica="${config.metric}"` +
                    ` ${config.operator} ${config.threshold} ──`
                );

                const valor = await obtenerValorActual(config, cacheEstaciones);

                if (valor === null) {
                    console.log(`[Alertas] Config ${config._id}: valor=null, saltando`);
                    continue;
                }

                // Acumular para sensor:update
                if (!valoresPorEstacion.has(config.stationId)) {
                    valoresPorEstacion.set(config.stationId, {
                        stationId: config.stationId,
                        source:    config.source,
                        timestamp: new Date().toISOString(),
                        datos:     {}
                    });
                }
                valoresPorEstacion.get(config.stationId).datos[config.metric] = valor;

                const umbralSuperado = evaluarUmbral(valor, config.operator, config.threshold);
                console.log(
                    `[Alertas] Config ${config._id}: ${valor} ${config.operator} ${config.threshold}` +
                    ` → ${umbralSuperado ? '⚠️  UMBRAL SUPERADO' : '✓  OK'}`
                );

                if (!umbralSuperado) continue;

                // Evitar duplicar alertas activas para la misma config
                const alertaActiva = await Alert.findOne({
                    userId:    config.userId,
                    stationId: config.stationId,
                    metric:    config.metric,
                    status:    'active'
                });
                if (alertaActiva) {
                    console.log(`[Alertas] Config ${config._id}: alerta activa ya existe (${alertaActiva._id}), omitiendo`);
                    continue;
                }

                const mensaje = construirMensaje(config, valor);
                const tipo    = ['battery', 'connection'].includes(config.metric) ? 'critical' : 'warning';

                const alerta = await Alert.create({
                    userId:      config.userId,
                    stationId:   config.stationId,
                    stationName: config.stationId,
                    type:        tipo,
                    metric:      config.metric,
                    value:       valor,
                    threshold:   config.threshold,
                    message:     mensaje
                });

                alertasGeneradas++;
                console.log(`[Alertas] Config ${config._id}: alerta creada (${alerta._id}) tipo=${tipo}`);

                // Notificación interna en BD + socket
                const tipoNotif   = tipo === 'critical' ? 'alerta_critica' : 'alerta_sensor';
                const tituloNotif = `⚠️ Alerta en ${config.stationId}`;
                await crearNotificacion(config.userId, tipoNotif, tituloNotif, mensaje, '/alertas');

                console.log(`[Alertas][Socket] Emitiendo notificacion:nueva a user:${config.userId}`);
                emitirNotificacionNueva(config.userId, { tipo: tipoNotif, titulo: tituloNotif, mensaje });

                emitirAlertaNueva(config.userId, {
                    id:      alerta._id,
                    tipo,
                    estacion: config.stationId,
                    metrica:  config.metric,
                    valor,
                    umbral:   config.threshold,
                    mensaje
                });

                // Email si el usuario tiene alertas críticas por email activadas
                const usuario = await User.findById(config.userId)
                    .select('email nombre notifications preferences');
                console.log(`[Alertas] Config ${config._id}: usuario=${usuario?.email} emailCritical=${usuario?.notifications?.emailCritical}`);
                if (usuario?.notifications?.emailCritical) {
                    console.log(`[Alertas] Config ${config._id}: enviando email de alerta a ${usuario.email}...`);
                    await enviarEmailAlertaCritica(usuario.email, `${usuario.nombre}${usuario.apellidos ? ' ' + usuario.apellidos : ''}`, {
                        stationName: config.stationId,
                        metric:      config.metric,
                        value:       valor,
                        threshold:   config.threshold,
                        message:     mensaje
                    }, usuario.preferences?.language ?? 'es');
                    console.log(`[Alertas] Config ${config._id}: email enviado correctamente`);
                }

            } catch (errorConfig) {
                console.error(`[Alertas] Error procesando config ${config._id}:`, errorConfig.message);
            }
        }

        // Emitir actualizaciones de sensor
        for (const datos of valoresPorEstacion.values()) {
            emitirActualizacionSensor(datos);
        }

        console.log(`\n[Alertas] ── Job completado: ${alertasGeneradas} alerta(s) generada(s) ──\n`);
        return { alertasGeneradas };

    } catch (error) {
        console.error('[Alertas] Error general en el job:', error.message);
        return { alertasGeneradas };
    }
};

export const iniciarJobAlertas = () => {
    cron.schedule('*/15 * * * *', comprobarAlertas, { timezone: 'Europe/Madrid' });
    console.log('Job de alertas iniciado — cada 15 minutos');
};
