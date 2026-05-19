import { chatbot, busquedaIA } from '../services/groq.service.js';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { respuestaExito, respuestaError } from '../utils/respuestas.js';

const CESENS_METRICAS = [1, 2, 6, 8, 28];

export const chat = async (req, res) => {
    try {
        const { messages } = req.body;
        const respuesta = await chatbot(messages);
        return respuestaExito(res, { reply: respuesta });
    } catch (error) {
        return respuestaError(res, 'Error en el chatbot. Inténtalo de nuevo.', 500, error.message);
    }
};

export const buscar = async (req, res) => {
    try {
        const { pregunta } = req.body;

        // Obtenemos datos actuales de ambas APIs en paralelo para dar contexto a la IA
        const [fcResult, csResult] = await Promise.allSettled([
            fieldclimate.obtenerEstaciones(),
            cesens.obtenerEstaciones()
        ]);

        const contexto = {
            fechaConsulta: new Date().toISOString(),
            fieldclimate: fcResult.status === 'fulfilled' ? fcResult.value : { error: 'No disponible' },
            cesens: csResult.status === 'fulfilled' ? csResult.value : { error: 'No disponible' }
        };

        const respuesta = await busquedaIA(pregunta, contexto);
        return respuestaExito(res, { respuesta });
    } catch (error) {
        return respuestaError(res, 'Error en la búsqueda. Inténtalo de nuevo.', 500, error.message);
    }
};
