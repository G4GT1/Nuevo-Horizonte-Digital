import cron from 'node-cron';
import { User } from '../models/user.model.js';
import { Alert } from '../models/alert.model.js';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { enviarResumenSemanal } from '../services/email.service.js';
import { crearNotificacion } from '../utils/notificaciones.js';
import { emitirNotificacionNueva } from '../sockets/index.js';
import { rangoUltimaSemana, formatearFechaCesens } from '../utils/fechas.js';

const calcularEstadisticas = (lecturas) => {
    const valores = lecturas.map(l => Number(l.value)).filter(v => !isNaN(v));
    if (!valores.length) return { media: null, min: null, max: null };
    const suma = valores.reduce((a, b) => a + b, 0);
    return {
        media: (suma / valores.length).toFixed(2),
        min: Math.min(...valores).toFixed(2),
        max: Math.max(...valores).toFixed(2)
    };
};

const generarResumenSemanal = async () => {
    console.log(`[${new Date().toISOString()}] Generando resumen semanal...`);

    try {
        const usuarios = await User.find({ 'notifications.weeklyReport': true, emailVerified: true, suspended: false });
        if (!usuarios.length) return;

        const hoy = new Date();
        const haceSemana = new Date(hoy);
        haceSemana.setDate(hoy.getDate() - 7);
        const desde = haceSemana.toISOString().split('T')[0];
        const hasta = hoy.toISOString().split('T')[0];

        // Obtenemos datos de ambas APIs una vez para todos los usuarios
        const [fcEstaciones, csEstaciones] = await Promise.allSettled([
            fieldclimate.obtenerEstaciones(),
            cesens.obtenerEstaciones()
        ]);

        const estacionesResumen = [];

        if (fcEstaciones.status === 'fulfilled') {
            const estaciones = Array.isArray(fcEstaciones.value) ? fcEstaciones.value : [];
            for (const estacion of estaciones.slice(0, 5)) {
                try {
                    const datos = await fieldclimate.obtenerDatosEstacion(estacion.name ?? estacion._id, desde, hasta);
                    const sensors = datos?.sensors ?? [];
                    const temp = sensors.find(s => s.name?.toLowerCase().includes('temp'));
                    const hum = sensors.find(s => s.name?.toLowerCase().includes('hum'));
                    estacionesResumen.push({
                        nombre: estacion.name ?? estacion._id,
                        fuente: 'FieldClimate',
                        temperatura: calcularEstadisticas(temp?.values ?? []),
                        humedad: calcularEstadisticas(hum?.values ?? []),
                        alertas: 0
                    });
                } catch {
                    // Si falla una estación, continuamos con las demás
                }
            }
        }

        if (csEstaciones.status === 'fulfilled') {
            const estaciones = Array.isArray(csEstaciones.value) ? csEstaciones.value : [];
            for (const estacion of estaciones.slice(0, 5)) {
                try {
                    const idUbicacion = estacion.id ?? estacion.id_ubicacion;
                    const [datosTemp, datosHum] = await Promise.allSettled([
                        cesens.obtenerDatosMetrica(idUbicacion, 1, haceSemana, hoy),
                        cesens.obtenerDatosMetrica(idUbicacion, 6, haceSemana, hoy)
                    ]);
                    estacionesResumen.push({
                        nombre: estacion.nombre ?? estacion.name ?? String(idUbicacion),
                        fuente: 'Cesens',
                        temperatura: calcularEstadisticas(datosTemp.status === 'fulfilled' ? (Array.isArray(datosTemp.value) ? datosTemp.value : []) : []),
                        humedad: calcularEstadisticas(datosHum.status === 'fulfilled' ? (Array.isArray(datosHum.value) ? datosHum.value : []) : []),
                        alertas: 0
                    });
                } catch {
                    // Si falla una estación, continuamos
                }
            }
        }

        // Añadir conteo de alertas de la semana por estación
        const alertasSemana = await Alert.find({
            createdAt: { $gte: haceSemana, $lte: hoy }
        });

        estacionesResumen.forEach(e => {
            e.alertas = alertasSemana.filter(a => a.stationId === e.nombre).length;
        });

        const datos = {
            desde: haceSemana.toLocaleDateString('es-ES'),
            hasta: hoy.toLocaleDateString('es-ES'),
            estaciones: estacionesResumen
        };

        // Enviar a cada usuario
        for (const usuario of usuarios) {
            try {
                await enviarResumenSemanal(usuario.email, usuario.nombre, datos, usuario.preferences?.language);

                const notif = await crearNotificacion(
                    usuario._id,
                    'resumen_semanal',
                    'Resumen semanal disponible',
                    `Tu resumen semanal del ${datos.desde} al ${datos.hasta} ha sido enviado por email.`,
                    '/dashboard'
                );

                // Emitir la notificación por socket si el usuario está conectado
                if (notif) {
                    emitirNotificacionNueva(usuario._id, {
                        id: notif._id,
                        tipo: notif.type,
                        titulo: notif.title,
                        mensaje: notif.message,
                        link: notif.link
                    });
                }
            } catch (errorUsuario) {
                console.error(`[Resumen] Error enviando a ${usuario.email}:`, errorUsuario.message);
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
