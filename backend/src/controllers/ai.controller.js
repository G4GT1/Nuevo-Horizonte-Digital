import { chatbot, busquedaIA, ayudaIA } from '../services/groq.service.js';
import { enviarTicketSoporte } from '../services/email.service.js';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { respuestaExito, respuestaError } from '../utils/respuestas.js';
import { ADMIN_EMAIL } from '../config.js';

/* Cache del contexto de estaciones para el prompt del LLM (TTL 5 min) */
let _ctxCache = { data: null, ts: 0 };
const CTX_TTL = 5 * 60 * 1000;

/**
 * Construye el string de contexto con los datos actuales de todas las estaciones
 * para inyectarlo como system message en el prompt del LLM.
 * Incluye hasta 6 metricas por estacion con su valor y unidad.
 * @returns {Promise<string>} Texto multilínea con estaciones FC y Cesens
 */
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

/**
 * Devuelve el contexto de estaciones cacheado o lo regenera si el TTL ha expirado.
 * @returns {Promise<string>}
 */
const getContextoEstaciones = async () => {
    const now = Date.now();
    if (_ctxCache.data && now - _ctxCache.ts < CTX_TTL) return _ctxCache.data;
    const data = await buildContextoEstaciones();
    _ctxCache = { data, ts: now };
    return data;
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Chatbot contextual con datos de estaciones. Mantiene historial de los ultimos 10 mensajes.
 * @param {import('express').Request} req - body: { messages: Array<{role, content}> }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { reply }
 */
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

/**
 * POST /api/ai/search
 * Busqueda semantica en los datos de estaciones usando el LLM con contexto.
 * @param {import('express').Request} req - body: { pregunta: string }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { respuesta }
 */
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

/**
 * POST /api/ai/help
 * Asistente de ayuda de la plataforma. No usa contexto de estaciones; responde sobre el uso del sistema.
 * @param {import('express').Request} req - body: { messages: Array<{role, content}> }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { reply }
 */
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

/**
 * POST /api/ai/ticket
 * Envia un ticket de soporte por email al ADMIN_EMAIL. Solo superadmin y tecnico.
 * @param {import('express').Request} req - body: { asunto, descripcion, urgencia }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con mensaje de confirmacion
 */
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
