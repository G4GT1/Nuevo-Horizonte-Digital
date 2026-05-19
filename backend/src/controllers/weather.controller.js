import { obtenerPrediccion } from '../services/openmeteo.service.js';
import { respuestaExito, respuestaError } from '../utils/respuestas.js';

export const getPrediccion = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const prediccion = await obtenerPrediccion(lat, lon);
        return respuestaExito(res, { prediccion });
    } catch (error) {
        return respuestaError(res, 'Error al obtener la predicción meteorológica', 500, error.message);
    }
};
