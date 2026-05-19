import axios from 'axios';
import { GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL } from '../config.js';

const cliente = axios.create({
    baseURL: GROQ_BASE_URL,
    headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

const SYSTEM_CHATBOT = `Eres el asistente virtual de Horizonte Verde Digital, una plataforma de gestión de sensores agrícolas del IES Galileo Galilei en Córdoba, España.
Tu función es ayudar a técnicos y alumnos con:
- Uso e interpretación de la plataforma (dashboards, alertas, informes, configuración)
- Agronomía general: interpretación de métricas como temperatura, humedad relativa, VWC del suelo, presión atmosférica y humectación foliar
- Recomendaciones sobre cultivos y condiciones climáticas

Responde siempre en español, de forma clara y concisa. Si no sabes algo, dilo honestamente.
No inventes datos de sensores; para eso el usuario tiene el buscador inteligente.`;

const SYSTEM_BUSCADOR = `Eres un motor de búsqueda inteligente para Horizonte Verde Digital.
Tienes acceso a los datos actuales de los sensores de las estaciones agrícolas. Analiza los datos proporcionados y responde a la pregunta del usuario de forma clara y en lenguaje natural.
Incluye valores concretos, unidades y, si procede, una breve interpretación agronómica.
Responde siempre en español.`;

export const chatbot = async (mensajes) => {
    const { data } = await cliente.post('/chat/completions', {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_CHATBOT },
            ...mensajes
        ],
        max_tokens: 1024,
        temperature: 0.7
    });
    return data.choices[0].message.content;
};

export const busquedaIA = async (pregunta, datosSensores) => {
    const contexto = `Datos actuales de sensores:\n${JSON.stringify(datosSensores, null, 2)}`;
    const { data } = await cliente.post('/chat/completions', {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_BUSCADOR },
            { role: 'user', content: `${contexto}\n\nPregunta: ${pregunta}` }
        ],
        max_tokens: 1024,
        temperature: 0.3
    });
    return data.choices[0].message.content;
};
