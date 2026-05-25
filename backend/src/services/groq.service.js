import axios from 'axios';
import { GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL } from '../config.js';

const cliente = axios.create({
    baseURL: GROQ_BASE_URL,
    headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

const buildSystemChatbot = (contextoEstaciones) => {
    const ctx = contextoEstaciones
        ? `\n\nDatos actuales de estaciones (caché 5 min):\n${contextoEstaciones}`
        : '';
    return `Eres el asistente agrícola de Horizonte Verde Digital, plataforma de sensores del IES Galileo Galilei de Córdoba, España.
REGLAS ESTRICTAS:
- Responde SIEMPRE en el idioma en que te hablen (español si hablan español, inglés si hablan inglés, etc.)
- Respuestas CONCISAS: máximo 2-3 líneas. Solo amplía si el usuario pide explícitamente más detalle.
- Usa los datos de estaciones del contexto para responder sobre estado, métricas y recomendaciones agronómicas.
- Si no tienes datos suficientes, dilo en una línea. No inventes valores de sensores.${ctx}`;
};

const buildSystemBuscador = (contextoEstaciones) => {
    const ctx = contextoEstaciones
        ? `\n\nDatos actuales:\n${contextoEstaciones}`
        : '';
    return `Eres el buscador inteligente de Horizonte Verde Digital (IES Galileo Galilei, Córdoba).
Responde en el idioma del usuario. Respuestas concisas con valores concretos y unidades. Máximo 3-4 líneas.
Cita los datos exactos del contexto. No inventes valores.${ctx}`;
};

export const chatbot = async (mensajes, contextoEstaciones = null) => {
    const { data } = await cliente.post('/chat/completions', {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: buildSystemChatbot(contextoEstaciones) },
            ...mensajes
        ],
        max_tokens: 512,
        temperature: 0.6
    });
    return data.choices[0].message.content;
};

const buildSystemAyuda = () =>
    `Eres el asistente de ayuda de Horizonte Verde Digital, una plataforma de monitorización IoT agrícola.
REGLAS ESTRICTAS:
- Solo respondes preguntas sobre el funcionamiento y uso de la plataforma (secciones, navegación, funciones, configuración).
- Responde SIEMPRE en el idioma del usuario.
- Máximo 3 líneas por respuesta. Conciso y directo.
- NO tienes acceso a datos reales de sensores en este modo. Si preguntan por valores, remite al Asistente IA.
- No respondas preguntas ajenas a la plataforma.`;

export const ayudaIA = async (mensajes) => {
    const { data } = await cliente.post('/chat/completions', {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: buildSystemAyuda() },
            ...mensajes
        ],
        max_tokens: 256,
        temperature: 0.4
    });
    return data.choices[0].message.content;
};

export const busquedaIA = async (pregunta, contextoEstaciones = null) => {
    const systemContent = buildSystemBuscador(contextoEstaciones);
    const { data } = await cliente.post('/chat/completions', {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: pregunta }
        ],
        max_tokens: 512,
        temperature: 0.3
    });
    return data.choices[0].message.content;
};
