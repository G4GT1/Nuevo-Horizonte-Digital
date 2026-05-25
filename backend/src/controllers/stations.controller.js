import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { respuestaExito, respuestaError, respuestaNoEncontrado } from '../utils/respuestas.js';
import StationMeta from '../models/stationMeta.model.js';

// IDs de métricas usados para histórico por defecto (cuando no se especifica uno concreto)
const CESENS_METRICAS_HIST = [1, 2, 6, 8, 12, 14, 28, 78, 95, 96];

// ── Helpers ────────────────────────────────────────────────────────────────

const encontrarEstacionFC = (estaciones, id) =>
    estaciones.find(e => e.name?.original === id || e._id === id);

const encontrarEstacionCesens = (estaciones, id) =>
    estaciones.find(e => String(e.id) === id || String(e.id_ubicacion) === id);

// ── Endpoints combinados ───────────────────────────────────────────────────

export const getEstaciones = async (req, res) => {
    try {
        const [fcResult, csResult, metaList] = await Promise.allSettled([
            fieldclimate.obtenerEstaciones(),
            cesens.obtenerEstacionesConMeta(),
            StationMeta.find({}).lean(),
        ]);

        const metaMap = {};
        if (metaList.status === 'fulfilled') {
            for (const m of metaList.value) metaMap[`${m.source}::${m.stationId}`] = m;
            console.log(`[getEstaciones] ${metaList.value.length} metadatos en BD:`, metaList.value.map(m => `${m.source}::${m.stationId} → lat=${m.lat}, lon=${m.lon}`));
        }

        const enrich = (e, source) => {
            const id = source === 'fieldclimate'
                ? (e.name?.original ?? e._id)
                : String(e.id ?? e.id_ubicacion);
            const meta = metaMap[`${source}::${id}`];
            if (meta?.lat != null && meta?.lon != null) {
                console.log(`[getEstaciones] Inyectando coords guardadas en ${source}::${id} → lat=${meta.lat}, lon=${meta.lon}`);
                return { ...e, source, _storedLat: meta.lat, _storedLon: meta.lon };
            }
            return { ...e, source };
        };

        const estaciones = [];

        if (fcResult.status === 'fulfilled') {
            const fcEstaciones = Array.isArray(fcResult.value) ? fcResult.value : [];
            fcEstaciones.forEach(e => estaciones.push(enrich(e, 'fieldclimate')));
        }

        if (csResult.status === 'fulfilled') {
            const csEstaciones = Array.isArray(csResult.value) ? csResult.value : [];
            csEstaciones.forEach(e => estaciones.push(enrich(e, 'cesens')));
        }

        return respuestaExito(res, { estaciones });
    } catch (error) {
        return respuestaError(res, 'Error al obtener las estaciones', 500, error.message);
    }
};

// ── FieldClimate ───────────────────────────────────────────────────────────

export const getEstacionesFC = async (req, res) => {
    try {
        const [rawResult, metaResult] = await Promise.allSettled([
            fieldclimate.obtenerEstaciones(),
            StationMeta.find({ source: 'fieldclimate' }).lean(),
        ]);

        const estaciones = rawResult.status === 'fulfilled' && Array.isArray(rawResult.value)
            ? rawResult.value : [];

        const metaMap = {};
        if (metaResult.status === 'fulfilled') {
            for (const m of metaResult.value) metaMap[m.stationId] = m;
        }

        console.log(`[FC] getEstacionesFC: ${estaciones.length} estaciones, ${Object.keys(metaMap).length} metas`);

        return respuestaExito(res, {
            estaciones: estaciones.map(e => {
                const id = e.name?.original ?? e._id;
                const meta = metaMap[id];
                if (meta?.lat != null && meta?.lon != null) {
                    return { ...e, source: 'fieldclimate', _storedLat: meta.lat, _storedLon: meta.lon };
                }
                return { ...e, source: 'fieldclimate' };
            })
        });
    } catch (error) {
        console.error('[FC] getEstacionesFC ERROR:', error.stack || error.message);
        return respuestaError(res, 'Error al obtener estaciones FieldClimate', 500, error.message);
    }
};

export const getEstacionFC = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[FC] getEstacionFC: id=${id}`);
        const estaciones = await fieldclimate.obtenerEstaciones();
        console.log(`[FC] getEstacionFC: ${Array.isArray(estaciones) ? estaciones.length : 'no-array'} estaciones`);
        const estacion = encontrarEstacionFC(Array.isArray(estaciones) ? estaciones : [], id);
        if (!estacion) {
            console.warn(`[FC] getEstacionFC: estación id=${id} no encontrada`);
            return respuestaNoEncontrado(res, 'Estación FieldClimate no encontrada');
        }
        return respuestaExito(res, { estacion: { ...estacion, source: 'fieldclimate' } });
    } catch (error) {
        console.error('[FC] getEstacionFC ERROR:', error.stack || error.message);
        return respuestaError(res, 'Error al obtener la estación FieldClimate', 500, error.message);
    }
};

export const getDatosActualesFC = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[FC] getDatosActualesFC: id=${id}`);
        const { principal, detalle, fecha } = await fieldclimate.obtenerUltimaDatosEstacion(id);
        console.log(`[FC] getDatosActualesFC: ${principal.length} principal, ${detalle.length} detalle, fecha=${fecha}`);
        return respuestaExito(res, { datos: { principal, detalle, fecha }, source: 'fieldclimate' });
    } catch (error) {
        console.error('[FC] getDatosActualesFC ERROR:', error.stack || error.message);
        return respuestaError(res, 'Error al obtener datos de la estación FieldClimate', 500, error.message);
    }
};

export const getHistoricoFC = async (req, res) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;
        console.log(`[FC] getHistoricoFC: id=${id} from=${from} to=${to}`);

        if (!from || !to) return respuestaError(res, 'Los parámetros from y to son requeridos (YYYY-MM-DD)', 400);

        const datos = await fieldclimate.obtenerDatosEstacion(id, from, to);
        console.log(`[FC] getHistoricoFC: datos recibidos, tipo=${typeof datos}`);
        return respuestaExito(res, { datos, source: 'fieldclimate' });
    } catch (error) {
        console.error('[FC] getHistoricoFC ERROR:', error.stack || error.message);
        return respuestaError(res, 'Error al obtener el histórico FieldClimate', 500, error.message);
    }
};

// ── Cesens ─────────────────────────────────────────────────────────────────

export const getEstacionesCesens = async (req, res) => {
    try {
        const raw = await cesens.obtenerEstacionesConMeta();
        const estaciones = Array.isArray(raw) ? raw : [];
        return respuestaExito(res, {
            estaciones: estaciones.map(e => ({ ...e, source: 'cesens' }))
        });
    } catch (error) {
        return respuestaError(res, 'Error al obtener estaciones Cesens', 500, error.message);
    }
};

export const getEstacionCesens = async (req, res) => {
    try {
        const { id } = req.params;
        const estaciones = await cesens.obtenerEstaciones();
        const estacion = encontrarEstacionCesens(estaciones, id);
        if (!estacion) return respuestaNoEncontrado(res, 'Estación Cesens no encontrada');
        return respuestaExito(res, { estacion: { ...estacion, source: 'cesens' } });
    } catch (error) {
        return respuestaError(res, 'Error al obtener la estación Cesens', 500, error.message);
    }
};

export const getDatosActualesCesens = async (req, res) => {
    try {
        const { id } = req.params;
        const { principal, detalle, fecha } = await cesens.obtenerUltimaLecturaEstacion(id);
        return respuestaExito(res, { datos: { principal, detalle, fecha }, source: 'cesens' });
    } catch (error) {
        return respuestaError(res, 'Error al obtener datos de la estación Cesens', 500, error.message);
    }
};

export const getHistoricoCesens = async (req, res) => {
    try {
        const { id } = req.params;
        const { from, to, metric } = req.query;

        if (!from || !to) return respuestaError(res, 'Los parámetros from y to son requeridos (YYYY-MM-DD)', 400);

        const metricas = metric ? [Number(metric)] : CESENS_METRICAS_HIST;
        const datos = await cesens.obtenerDatosHistorico(id, metricas, new Date(from), new Date(to));

        return respuestaExito(res, { datos, source: 'cesens' });
    } catch (error) {
        return respuestaError(res, 'Error al obtener el histórico Cesens', 500, error.message);
    }
};

// ── Endpoints genéricos (backwards compat con ?source=) ───────────────────

export const getEstacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { source } = req.query;

        if (!source) return respuestaError(res, 'El parámetro source es requerido (fieldclimate | cesens)', 400);

        if (source === 'fieldclimate') {
            const estaciones = await fieldclimate.obtenerEstaciones();
            const estacion = encontrarEstacionFC(estaciones, id);
            if (!estacion) return respuestaNoEncontrado(res, 'Estación no encontrada');
            return respuestaExito(res, { estacion: { ...estacion, source: 'fieldclimate' } });
        }

        if (source === 'cesens') {
            const estaciones = await cesens.obtenerEstaciones();
            const estacion = encontrarEstacionCesens(estaciones, id);
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
            const { principal, detalle, fecha } = await fieldclimate.obtenerUltimaDatosEstacion(id);
            return respuestaExito(res, { datos: { principal, detalle, fecha }, source: 'fieldclimate' });
        }

        if (source === 'cesens') {
            const { principal, detalle, fecha } = await cesens.obtenerUltimaLecturaEstacion(id);
            return respuestaExito(res, { datos: { principal, detalle, fecha }, source: 'cesens' });
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
            const metricas = metric ? [Number(metric)] : CESENS_METRICAS_HIST;
            const datos = await cesens.obtenerDatosHistorico(id, metricas, new Date(from), new Date(to));
            return respuestaExito(res, { datos, source: 'cesens' });
        }

        return respuestaError(res, 'source no válido', 400);
    } catch (error) {
        return respuestaError(res, 'Error al obtener el histórico', 500, error.message);
    }
};

// ── Métricas disponibles de una estación (para el configurador de umbrales) ─

export const getMetricasEstacion = async (req, res) => {
    const { source, id } = req.params;
    try {
        let datos;
        if (source === 'fieldclimate') {
            datos = await fieldclimate.obtenerUltimaDatosEstacion(id);
        } else if (source === 'cesens') {
            datos = await cesens.obtenerUltimaLecturaEstacion(id);
        } else {
            return respuestaError(res, `Fuente desconocida: ${source}`, 400);
        }

        const todas = [...(datos?.principal ?? []), ...(datos?.detalle ?? [])];
        const metricas = todas
            .filter(m => m.valor !== null && m.nombreOriginal)
            .map(m => ({
                id:     m.nombreOriginal,   // identificador canónico → guardado en AlertConfig.metric
                nombre: m.nombre,           // nombre en español → mostrado en el selector
                unidad: m.unidad ?? '',
                valor:  m.valor,
            }));

        return respuestaExito(res, { metricas });
    } catch (err) {
        return respuestaError(res, 'Error al obtener las métricas de la estación', 500, err.message);
    }
};

// ── Station meta (manual coordinates) ─────────────────────────────────────

export const getStationMeta = async (req, res) => {
    const { source, id } = req.params;
    try {
        const meta = await StationMeta.findOne({ stationId: id, source }).lean();
        return respuestaExito(res, { meta: meta ?? { stationId: id, source, lat: null, lon: null } });
    } catch (err) {
        return respuestaError(res, 'Error al obtener metadatos de la estación', 500, err.message);
    }
};

// ── Active sensor count (dashboard KPI) ───────────────────────────────────

let _sensorCountCache = null;
let _sensorCountCacheTs = 0;

export const getActiveSensors = async (req, res) => {
    if (_sensorCountCache && Date.now() - _sensorCountCacheTs < 60_000) {
        return respuestaExito(res, _sensorCountCache);
    }

    try {
        const [fcResult, csResult] = await Promise.allSettled([
            fieldclimate.obtenerEstaciones(),
            cesens.obtenerEstacionesConMeta(),
        ]);

        const fcEstaciones = fcResult.status === 'fulfilled' && Array.isArray(fcResult.value)
            ? fcResult.value : [];
        const csEstaciones = csResult.status === 'fulfilled' && Array.isArray(csResult.value)
            ? csResult.value : [];

        // Count FC active sensors across all stations (concurrent, with timeout per station)
        const fcDataResults = await Promise.allSettled(
            fcEstaciones.map(e => {
                const id = e.name?.original ?? e._id;
                return Promise.race([
                    fieldclimate.obtenerUltimaDatosEstacion(id),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
                ]);
            })
        );

        let fcCount = 0;
        for (const r of fcDataResults) {
            if (r.status !== 'fulfilled') continue;
            const { principal = [], detalle = [] } = r.value ?? {};
            fcCount += [...principal, ...detalle].filter(m => m.valor !== null && m.valor !== undefined).length;
        }

        // Count Cesens active sensors
        const csDataResults = await Promise.allSettled(
            csEstaciones.map(e => {
                const id = String(e.id ?? e.id_ubicacion);
                return Promise.race([
                    cesens.obtenerUltimaLecturaEstacion(id),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
                ]);
            })
        );

        let csCount = 0;
        for (const r of csDataResults) {
            if (r.status !== 'fulfilled') continue;
            const { principal = [], detalle = [] } = r.value ?? {};
            csCount += [...principal, ...detalle].filter(m => m.valor !== null && m.valor !== undefined).length;
        }

        const payload = { total: fcCount + csCount, fieldclimate: fcCount, cesens: csCount };
        _sensorCountCache = payload;
        _sensorCountCacheTs = Date.now();
        console.log(`[getActiveSensors] FC=${fcCount} Cesens=${csCount} total=${fcCount + csCount}`);
        return respuestaExito(res, payload);
    } catch (error) {
        return respuestaError(res, 'Error al contar sensores activos', 500, error.message);
    }
};

export const saveStationMeta = async (req, res) => {
    const { source, id } = req.params;
    const { lat, lon } = req.body;
    if (lat == null || lon == null) return respuestaError(res, 'lat y lon son requeridos', 400);
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo)) return respuestaError(res, 'lat y lon deben ser números válidos', 400);
    console.log(`[saveStationMeta] Guardando coordenadas: source=${source}, id=${id}, lat=${la}, lon=${lo}`);
    try {
        const meta = await StationMeta.findOneAndUpdate(
            { stationId: id, source },
            { lat: la, lon: lo },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`[saveStationMeta] Guardado OK → _id=${meta._id}, lat=${meta.lat}, lon=${meta.lon}`);
        return respuestaExito(res, { meta });
    } catch (err) {
        console.error(`[saveStationMeta] Error:`, err.message);
        return respuestaError(res, 'Error al guardar metadatos de la estación', 500, err.message);
    }
};
