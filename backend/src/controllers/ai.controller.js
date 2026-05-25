import { chatbot, busquedaIA, ayudaIA } from '../services/groq.service.js';
import { enviarTicketSoporte } from '../services/email.service.js';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { respuestaExito, respuestaError } from '../utils/respuestas.js';
import { ADMIN_EMAIL } from '../config.js';

// ── Caché de contexto de estaciones (TTL 5 min) ───────────────────────────────

let _ctxCache = { data: null, ts: 0 };
const CTX_TTL = 5 * 60 * 1000;

const buildContextoEstaciones = async () => {
    const lineas = [];

    try {
        const estaciones = await fieldclimate.obtenerEstaciones();
        const lista = Array.isArray(estaciones) ? estaciones : [];

        const datosFC = await Promise.allSettled(
            lista.map((st) => {
                const id = st.name?.original ?? st._id ?? st.id;
                return fieldclimate.obtenerUltimaDatosEstacion(id);
            })
        );

        lista.forEach((st, i) => {
            const nombre = st.name?.custom ?? st.name?.original ?? st._id ?? '?';
            const conectada = st.dates?.last_communication ? 'online' : 'offline';
            let metricas = '';
            if (datosFC[i].status === 'fulfilled') {
                const d = datosFC[i].value;
                const todas = [...(d?.principal ?? []), ...(d?.detalle ?? [])];
                metricas = todas
                    .filter((m) => m.valor !== null && m.valor !== undefined)
                    .slice(0, 6)
                    .map((m) => `${m.nombre}=${m.valor}${m.unidad ?? ''}`)
                    .join(', ');
            }
            lineas.push(`[FC] ${nombre} (${conectada})${metricas ? ': ' + metricas : ': sin datos'}`);
        });
    } catch {
        lineas.push('[FC] No disponible');
    }

    try {
        const estaciones = await cesens.obtenerEstaciones();
        const lista = Array.isArray(estaciones) ? estaciones : [];

        const datosCS = await Promise.allSettled(
            lista.map((st) => {
                const id = String(st.id ?? st.id_ubicacion ?? '');
                return cesens.obtenerUltimaLecturaEstacion(id);
            })
        );

        lista.forEach((st, i) => {
            const nombre = st.nombre ?? st.ubicacion ?? `Cesens #${st.id}`;
            let metricas = '';
            if (datosCS[i].status === 'fulfilled') {
                const d = datosCS[i].value;
                const todas = [...(d?.principal ?? []), ...(d?.detalle ?? [])];
                metricas = todas
                    .filter((m) => m.valor !== null && m.valor !== undefined)
                    .slice(0, 6)
                    .map((m) => `${m.nombre}=${m.valor}${m.unidad ?? ''}`)
                    .join(', ');
            }
            lineas.push(`[CS] ${nombre}${metricas ? ': ' + metricas : ': sin datos'}`);
        });
    } catch {
        lineas.push('[CS] No disponible');
    }

    return lineas.join('\n');
};

const getContextoEstaciones = async () => {
    const now = Date.now();
    if (_ctxCache.data && now - _ctxCache.ts < CTX_TTL) return _ctxCache.data;
    const data = await buildContextoEstaciones();
    _ctxCache = { data, ts: now };
    return data;
};

// ── Controllers ───────────────────────────────────────────────────────────────

export const chat = async (req, res) => {
    try {
        const { messages } = req.body;
        const historial = Array.isArray(messages) ? messages.slice(-10) : [];
        const contexto = await getContextoEstaciones();
        const respuesta = await chatbot(historial, contexto);
        return respuestaExito(res, { reply: respuesta });
    } catch (error) {
        return respuestaError(res, 'Error en el chatbot. Inténtalo de nuevo.', 500, error.message);
    }
};

export const buscar = async (req, res) => {
    try {
        const { pregunta } = req.body;
        const contexto = await getContextoEstaciones();
        const respuesta = await busquedaIA(pregunta, contexto);
        return respuestaExito(res, { respuesta });
    } catch (error) {
        return respuestaError(res, 'Error en la búsqueda. Inténtalo de nuevo.', 500, error.message);
    }
};

export const ayuda = async (req, res) => {
    try {
        const { messages } = req.body;
        const historial = Array.isArray(messages) ? messages.slice(-10) : [];
        const respuesta = await ayudaIA(historial);
        return respuestaExito(res, { reply: respuesta });
    } catch (error) {
        return respuestaError(res, 'Error en el asistente de ayuda.', 500, error.message);
    }
};

export const ticket = async (req, res) => {
    try {
        const { asunto, descripcion, urgencia } = req.body;
        const usuario = req.user;
        await enviarTicketSoporte(ADMIN_EMAIL, { asunto, descripcion, urgencia, usuario });
        return respuestaExito(res, null, 'Ticket enviado correctamente.');
    } catch (error) {
        return respuestaError(res, 'Error al enviar el ticket.', 500, error.message);
    }
};
