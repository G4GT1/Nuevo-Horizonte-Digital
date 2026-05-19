import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { respuestaExito, respuestaError, respuestaNoEncontrado } from '../utils/respuestas.js';

const CESENS_METRICAS = [1, 2, 6, 8, 28, 12, 14, 78, 95, 96];

export const getEstaciones = async (req, res) => {
    try {
        const [fcResult, csResult] = await Promise.allSettled([
            fieldclimate.obtenerEstaciones(),
            cesens.obtenerEstaciones()
        ]);

        const estaciones = [];

        if (fcResult.status === 'fulfilled') {
            const fcEstaciones = Array.isArray(fcResult.value) ? fcResult.value : [];
            fcEstaciones.forEach(e => estaciones.push({ ...e, source: 'fieldclimate' }));
        }

        if (csResult.status === 'fulfilled') {
            const csEstaciones = Array.isArray(csResult.value) ? csResult.value : [];
            csEstaciones.forEach(e => estaciones.push({ ...e, source: 'cesens' }));
        }

        return respuestaExito(res, { estaciones });
    } catch (error) {
        return respuestaError(res, 'Error al obtener las estaciones', 500, error.message);
    }
};

export const getEstacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { source } = req.query;

        if (!source) return respuestaError(res, 'El parámetro source es requerido (fieldclimate | cesens)', 400);

        if (source === 'fieldclimate') {
            const estaciones = await fieldclimate.obtenerEstaciones();
            const estacion = estaciones.find(e => e.name === id || e._id === id);
            if (!estacion) return respuestaNoEncontrado(res, 'Estación no encontrada');
            return respuestaExito(res, { estacion: { ...estacion, source: 'fieldclimate' } });
        }

        if (source === 'cesens') {
            const estaciones = await cesens.obtenerEstaciones();
            const estacion = estaciones.find(e => String(e.id) === id || String(e.id_ubicacion) === id);
            if (!estacion) return respuestaNoEncontrado(res, 'Estación no encontrada');
            return respuestaExito(res, { estacion: { ...estacion, source: 'cesens' } });
        }

        return respuestaError(res, 'source no válido. Usa: fieldclimate o cesens', 400);
    } catch (error) {
        return respuestaError(res, 'Error al obtener la estación', 500, error.message);
    }
};

export const getDatosActuales = async (req, res) => {
    try {
        const { id } = req.params;
        const { source } = req.query;

        if (!source) return respuestaError(res, 'El parámetro source es requerido', 400);

        if (source === 'fieldclimate') {
            const datos = await fieldclimate.obtenerUltimaDatosEstacion(id);
            return respuestaExito(res, { datos, source: 'fieldclimate' });
        }

        if (source === 'cesens') {
            const datos = await cesens.obtenerUltimosDatos(id, CESENS_METRICAS);
            return respuestaExito(res, { datos, source: 'cesens' });
        }

        return respuestaError(res, 'source no válido', 400);
    } catch (error) {
        return respuestaError(res, 'Error al obtener los datos de la estación', 500, error.message);
    }
};

export const getHistorico = async (req, res) => {
    try {
        const { id } = req.params;
        const { source, from, to, metric } = req.query;

        if (!source) return respuestaError(res, 'El parámetro source es requerido', 400);
        if (!from || !to) return respuestaError(res, 'Los parámetros from y to son requeridos (YYYY-MM-DD)', 400);

        if (source === 'fieldclimate') {
            const datos = await fieldclimate.obtenerDatosEstacion(id, from, to);
            return respuestaExito(res, { datos, source: 'fieldclimate' });
        }

        if (source === 'cesens') {
            const metricas = metric ? [Number(metric)] : CESENS_METRICAS;
            const resultados = await Promise.allSettled(
                metricas.map(m => cesens.obtenerDatosMetrica(id, m, new Date(from), new Date(to)))
            );
            const datos = resultados.map((r, i) => ({
                idMetrica: metricas[i],
                datos: r.status === 'fulfilled' ? r.value : null
            }));
            return respuestaExito(res, { datos, source: 'cesens' });
        }

        return respuestaError(res, 'source no válido', 400);
    } catch (error) {
        return respuestaError(res, 'Error al obtener el histórico', 500, error.message);
    }
};
