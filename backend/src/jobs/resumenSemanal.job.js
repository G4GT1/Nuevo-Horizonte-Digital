import cron from 'node-cron';
import { User } from '../models/user.model.js';
import { Alert } from '../models/alert.model.js';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { enviarResumenSemanal } from '../services/email.service.js';
import { crearNotificacion } from '../utils/notificaciones.js';
import { emitirNotificacionNueva } from '../sockets/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const calcStats = (nums) => {
    const valid = nums.filter(v => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
    if (!valid.length) return null;
    const sum = valid.reduce((a, b) => a + b, 0);
    return {
        media: (sum / valid.length).toFixed(1),
        min:   Math.min(...valid).toFixed(1),
        max:   Math.max(...valid).toFixed(1),
    };
};

// Extrae todos los valores numéricos de un sensor FC raw (sensor.values = { avg: [...] | last: [...] })
const extractFCSensorVals = (sensor) => {
    if (!sensor?.values) return [];
    const pref = ['avg', 'last', 'min', 'max'];
    const key = pref.find(k => Array.isArray(sensor.values[k]) && sensor.values[k].length > 0)
             ?? Object.keys(sensor.values)[0];
    return key ? (sensor.values[key] ?? []).filter(v => v !== null && v !== undefined) : [];
};

// Match sensor name (raw string) for temperature and humidity/moisture
const isTemp = (name) => typeof name === 'string' && /temp(erature|eratura)?/i.test(name);
const isHum  = (name) => typeof name === 'string' && /(humid(ity|ad)|moisture|humedad)/i.test(name);

// Calcula stats a partir de array [{ts, valor}] devuelto por obtenerDatosMetrica
const calcStatsValor = (lecturas) => {
    const nums = (Array.isArray(lecturas) ? lecturas : [])
        .map(l => l.valor)
        .filter(v => v !== null && !isNaN(Number(v)))
        .map(Number);
    return calcStats(nums);
};

// ── Builder de datos de estaciones (compartido) ───────────────────────────────

export const buildDatosEstaciones = async ({ desde, hasta, haceSemana, hoy }) => {
    const [fcResult, csResult] = await Promise.allSettled([
        fieldclimate.obtenerEstaciones(),
        cesens.obtenerEstaciones(),
    ]);

    const estacionesResumen = [];

    // ── FieldClimate ──
    if (fcResult.status === 'fulfilled') {
        const lista = Array.isArray(fcResult.value) ? fcResult.value : [];
        for (const est of lista.slice(0, 8)) {
            try {
                // ID: nombre original (serial), no el objeto name completo
                const id     = est.name?.original ?? est._id ?? est.id;
                const nombre = est.name?.custom ?? est.name?.original ?? String(id);

                const datos   = await fieldclimate.obtenerDatosEstacion(id, desde, hasta);
                // Raw FC API: { data: [...sensors], dates: [...] }
                const sensors = Array.isArray(datos?.data) ? datos.data : [];

                if (sensors.length === 0) {
                    console.log(`[Resumen][FC] ${nombre} (${id}): sin sensores en el histórico ${desde}→${hasta}`);
                }

                // Buscar sensor de temperatura (aire o suelo) y humedad/humectación/moisture
                const tempSensor = sensors.find(s => isTemp(s.name));
                const humSensor  = sensors.find(s => isHum(s.name));

                const tempStats = calcStats(extractFCSensorVals(tempSensor));
                const humStats  = calcStats(extractFCSensorVals(humSensor));

                if (!tempStats && !humStats && sensors.length > 0) {
                    console.log(
                        `[Resumen][FC] ${nombre}: sin temperatura ni humedad. ` +
                        `Sensores: ${sensors.map(s => s.name).slice(0, 8).join(', ')}`
                    );
                }

                const alertas = await Alert.countDocuments({
                    stationId: id,
                    createdAt: { $gte: haceSemana, $lte: hoy },
                });

                estacionesResumen.push({ nombre, fuente: 'FieldClimate', temperatura: tempStats, humedad: humStats, alertas });
            } catch (err) {
                console.error(`[Resumen][FC] Error en estación ${est.name?.original ?? est._id}:`, err.message);
            }
        }
    } else {
        console.error('[Resumen][FC] No se pudo obtener la lista de estaciones:', fcResult.reason?.message);
    }

    // ── Cesens ──
    if (csResult.status === 'fulfilled') {
        const lista = Array.isArray(csResult.value) ? csResult.value : [];
        for (const est of lista.slice(0, 8)) {
            try {
                const idUbicacion = est.id ?? est.id_ubicacion;
                const nombre = est.nombre ?? est.name ?? `Cesens #${idUbicacion}`;

                // Métrica 1 = Temperatura, Métrica 6 = Humedad Relativa
                // obtenerDatosMetrica devuelve [{ts, valor}] — usar .valor, NO .value
                const [datosTemp, datosHum] = await Promise.allSettled([
                    cesens.obtenerDatosMetrica(idUbicacion, 1, haceSemana, hoy),
                    cesens.obtenerDatosMetrica(idUbicacion, 6, haceSemana, hoy),
                ]);

                const tempLecturas = datosTemp.status === 'fulfilled' ? (datosTemp.value ?? []) : [];
                const humLecturas  = datosHum.status  === 'fulfilled' ? (datosHum.value  ?? []) : [];

                const tempStats = calcStatsValor(tempLecturas);
                const humStats  = calcStatsValor(humLecturas);

                if (!tempStats && !humStats) {
                    console.log(
                        `[Resumen][CS] ${nombre}: sin datos. ` +
                        `Temp=${tempLecturas.length} reg, Hum=${humLecturas.length} reg` +
                        (datosTemp.status === 'rejected' ? ` (Temp error: ${datosTemp.reason?.message})` : '') +
                        (datosHum.status  === 'rejected' ? ` (Hum error: ${datosHum.reason?.message})`  : '')
                    );
                }

                const alertas = await Alert.countDocuments({
                    stationId: String(idUbicacion),
                    createdAt: { $gte: haceSemana, $lte: hoy },
                });

                estacionesResumen.push({ nombre, fuente: 'Cesens', temperatura: tempStats, humedad: humStats, alertas });
            } catch (err) {
                console.error(`[Resumen][CS] Error en estación ${est.id}:`, err.message);
            }
        }
    } else {
        console.error('[Resumen][CS] No se pudo obtener la lista de estaciones:', csResult.reason?.message);
    }

    return estacionesResumen;
};

// ── Job principal ─────────────────────────────────────────────────────────────

const generarResumenSemanal = async () => {
    console.log(`[${new Date().toISOString()}] Generando resumen semanal...`);

    try {
        const usuarios = await User.find({
            'notifications.weeklyReport': true,
            emailVerified: true,
            suspended: false,
        });
        if (!usuarios.length) {
            console.log('[Resumen] Sin usuarios con resumen semanal activo');
            return;
        }

        const hoy        = new Date();
        const haceSemana = new Date(hoy);
        haceSemana.setDate(hoy.getDate() - 7);
        const desde = haceSemana.toISOString().split('T')[0];
        const hasta  = hoy.toISOString().split('T')[0];

        const estacionesResumen = await buildDatosEstaciones({ desde, hasta, haceSemana, hoy });

        const datos = {
            desde: haceSemana.toLocaleDateString('es-ES'),
            hasta:  hoy.toLocaleDateString('es-ES'),
            estaciones: estacionesResumen,
        };

        console.log(`[Resumen] ${estacionesResumen.length} estaciones, enviando a ${usuarios.length} usuario(s)`);

        for (const usuario of usuarios) {
            try {
                // Usar nombre del modelo User; fallback a email si está vacío
                const nombreUsuario = usuario.nombre?.trim() || usuario.email;
                await enviarResumenSemanal(usuario.email, nombreUsuario, datos, usuario.preferences?.language);

                const notif = await crearNotificacion(
                    usuario._id,
                    'resumen_semanal',
                    'Resumen semanal disponible',
                    `Tu resumen semanal del ${datos.desde} al ${datos.hasta} ha sido enviado por email.`,
                    '/dashboard'
                );

                if (notif) {
                    emitirNotificacionNueva(usuario._id, {
                        id:     notif._id,
                        tipo:   notif.type,
                        titulo: notif.title,
                        mensaje: notif.message,
                        link:   notif.link,
                    });
                }
            } catch (err) {
                console.error(`[Resumen] Error enviando a ${usuario.email}:`, err.message);
            }
        }

        console.log(`[${new Date().toISOString()}] Resumen semanal enviado a ${usuarios.length} usuarios.`);
    } catch (error) {
        console.error('[Resumen] Error general en el job:', error.message);
    }
};

export const iniciarJobResumenSemanal = () => {
    cron.schedule('0 8 * * 1', generarResumenSemanal, { timezone: 'Europe/Madrid' });
    console.log('Job de resumen semanal iniciado — lunes 08:00 AM');
};
