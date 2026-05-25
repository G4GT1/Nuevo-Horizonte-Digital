import axios from 'axios';
import { generarCabecerasFieldClimate } from '../utils/hmac.js';
import { FIELDCLIMATE_BASE_URL, FIELDCLIMATE_PUBLIC_KEY, FIELDCLIMATE_PRIVATE_KEY } from '../config.js';

const cliente = axios.create({ baseURL: FIELDCLIMATE_BASE_URL });

const cabeceras = (method, path) =>
    generarCabecerasFieldClimate(method, path, FIELDCLIMATE_PUBLIC_KEY, FIELDCLIMATE_PRIVATE_KEY);

const logApiError = (fn, path, err) => {
    if (err.response) {
        console.error(`[fieldclimate] ${fn} ${path} → HTTP ${err.response.status}`, JSON.stringify(err.response.data));
    } else {
        console.error(`[fieldclimate] ${fn} ${path} → ${err.message}`);
    }
};

// Traducciones de nombres de sensores (inglés → español)

const TRADUCCIONES_FC = {
    'Battery':                    'Batería',
    'Solar Panel':                'Panel Solar',
    'EnviroPro Soil Moisture':    'Humedad Suelo',
    'EnviroPro Soil Temperature': 'Temperatura Suelo',
    'Air Temperature':            'Temperatura Aire',
    'Relative Humidity':          'Humedad Relativa',
    'Precipitation':              'Precipitación',
    'Wind Speed':                 'Velocidad Viento',
    'Wind Direction':             'Dirección Viento',
    'Leaf Wetness':               'Humectación Foliar',
    'Solar Radiation':            'Radiación Solar',
};

const traducirNombreFC = (original) => {
    if (!original) return original;
    if (TRADUCCIONES_FC[original]) return TRADUCCIONES_FC[original];
    // "EnviroPro Soil Moisture 1" → "Humedad Suelo 1"
    const m = original.match(/^(.+?)\s+(\d+)$/);
    if (m && TRADUCCIONES_FC[m[1]]) return `${TRADUCCIONES_FC[m[1]]} ${m[2]}`;
    return original;
};

export const obtenerEstaciones = async () => {
    const path = '/user/stations';
    console.log(`[fieldclimate] obtenerEstaciones → ${FIELDCLIMATE_BASE_URL}${path}`);
    try {
        const { data } = await cliente.get(path, { headers: cabeceras('GET', path) });
        return data;
    } catch (err) {
        logApiError('obtenerEstaciones', path, err);
        throw err;
    }
};

export const obtenerDatosEstacion = async (stationId, from, to) => {
    // Slice to YYYY-MM-DD before appending time — guards against ISO strings
    // that already contain a time component (e.g. "2026-01-01T00:00:00Z")
    const fromDate = new Date(`${String(from).slice(0, 10)}T00:00:00Z`);
    const toDate   = new Date(`${String(to  ).slice(0, 10)}T23:59:59Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error(`Fechas no válidas para FieldClimate: from="${from}", to="${to}"`);
    }

    const fromTs = Math.floor(fromDate.getTime() / 1000);
    const toTs   = Math.floor(toDate.getTime()   / 1000);

    if (fromTs <= 0 || toTs <= 0 || fromTs >= toTs) {
        throw new Error(`Timestamps inválidos: from=${fromTs}, to=${toTs}`);
    }

    const path = `/data/${stationId}/raw/from/${fromTs}/to/${toTs}`;
    console.log(`[fieldclimate] obtenerDatosEstacion → ${path}`);
    try {
        const { data } = await cliente.get(path, { headers: cabeceras('GET', path) });
        return data;
    } catch (err) {
        logApiError('obtenerDatosEstacion', path, err);
        throw err;
    }
};

export const obtenerUltimaDatosEstacion = async (stationId) => {
    const toTs   = Math.floor(Date.now() / 1000);
    const fromTs = toTs - 2 * 3600; // últimas 2 horas
    const path = `/data/${stationId}/raw/from/${fromTs}/to/${toTs}`;
    console.log(`[fieldclimate] obtenerUltimaDatosEstacion → ${FIELDCLIMATE_BASE_URL}${path}`);

    try {
        const { data } = await cliente.get(path, { headers: cabeceras('GET', path) });

        // data.dates = array de timestamps Unix
        // data.data  = array de sensores: { name, unit, decimals, ch, code, group, values: { avg: [...], last: [...], ... } }
        const fechas   = Array.isArray(data?.dates) ? data.dates : [];
        const sensores = Array.isArray(data?.data)  ? data.data  : [];
        const ultimaFecha = fechas.length > 0 ? fechas[fechas.length - 1] : null;

        console.log(`[fieldclimate] obtenerUltimaDatosEstacion: ${sensores.length} sensores, ${fechas.length} fechas`);

        // Log estructura del primer sensor para diagnóstico
        if (sensores.length > 0) {
            const s0 = sensores[0];
            console.log('[fieldclimate] estructura sensor[0]:', JSON.stringify({
                name:          s0.name,
                name_original: s0.name_original,
                unit:          s0.unit,
                ch:            s0.ch,
                code:          s0.code,
                group:         s0.group,
            }));
        }

        // Extrae nombre original de forma robusta con prioridad clara
        const extraerNombreOrig = (s) => {
            // Prioridad 1: s.name_original (si existe y no es null/undefined)
            if (s.name_original) return s.name_original;

            // Prioridad 2: s.name.original (si s.name es objeto con esa propiedad)
            if (typeof s.name === 'object' && s.name !== null && s.name.original) {
                return s.name.original;
            }

            // Prioridad 3: s.name como string directo
            if (typeof s.name === 'string' && s.name) {
                return s.name;
            }

            // Fallback: cadena vacía
            return '';
        };

        const extraerNombreCustom = (s) =>
            (typeof s.name === 'object' && s.name !== null ? s.name.custom : null);

        const todasMetricas = sensores
            .filter(s => {
                const nombreOrig = extraerNombreOrig(s);
                if (/serial.?number/i.test(nombreOrig)) return false;
                if (/calculation/i.test(s.group ?? '') || /calculation/i.test(nombreOrig)) return false;
                const primerAggr = Object.keys(s.values ?? {})[0];
                if (!primerAggr) return false;
                const vals = s.values[primerAggr];
                return Array.isArray(vals) && vals.some(v => v !== null && v !== undefined);
            })
            .map(s => {
                const aggrPref  = ['avg', 'last', 'min', 'max'];
                const tipoAggr  = aggrPref.find(a => s.values?.[a]) ?? Object.keys(s.values ?? {})[0] ?? 'avg';
                const valores   = Array.isArray(s.values?.[tipoAggr]) ? s.values[tipoAggr] : [];

                let ultimoValor = null;
                for (let i = valores.length - 1; i >= 0; i--) {
                    if (valores[i] !== null && valores[i] !== undefined) {
                        ultimoValor = valores[i];
                        break;
                    }
                }

                const nombreOrig   = extraerNombreOrig(s);
                const nombreCustom = extraerNombreCustom(s);
                let decimals = typeof s.decimals === 'number' ? s.decimals : 2;
                let valor    = ultimoValor !== null ? parseFloat(ultimoValor.toFixed(decimals)) : null;
                let unidad   = s.unit ?? '';

                if (/battery/i.test(nombreOrig) && ultimoValor !== null) {
                    valor    = Math.min(100, Math.round((ultimoValor / 7000) * 100));
                    unidad   = '%';
                    decimals = 0;
                }

                return {
                    nombre:         traducirNombreFC(nombreCustom ?? nombreOrig) || `Sensor ${s.code}`,
                    nombreOriginal: nombreOrig || `Sensor ${s.code}`,
                    unidad,
                    valor,
                    decimals,
                    tipoAggr,
                    canal:  s.ch   ?? null,
                    codigo: s.code ?? null,
                    grupo:  s.group ?? null,
                };
            });

        // Clasificación en principal y detalle
        const DEFS_PRINCIPAL = [
            { re: /^air temperature/i,   label: 'Temperatura del Aire',  avg: false },
            { re: /^relative humidity/i, label: 'Humedad Relativa',      avg: false },
            { re: /^solar radiation/i,   label: 'Radiación Solar',       avg: false },
            { re: /^precipitation/i,     label: 'Precipitación',         avg: false },
            { re: /^leaf wetness/i,      label: 'Humectación Foliar',    avg: false },
            { re: /^wind speed/i,        label: 'Velocidad del Viento',  avg: false },
            { re: /^battery/i,           label: 'Batería',               avg: false },
            { re: /soil temperature/i,   label: 'Temperatura del Suelo', avg: true  },
            { re: /soil moisture/i,      label: 'Humedad del Suelo',     avg: true  },
        ];

        // Log todos los nombres originales detectados para diagnóstico
        console.log('[fieldclimate] nombreOriginal de todos los sensores:', todasMetricas.map(m => m.nombreOriginal));

        const principal = [];
        const usadasEnPrincipal = new Set();

        for (const def of DEFS_PRINCIPAL) {
            const coincidencias = todasMetricas.filter(m => def.re.test(m.nombreOriginal));
            console.log(`[fieldclimate] patrón "${def.re}" → ${coincidencias.length} coincidencias:`, coincidencias.map(m => m.nombreOriginal));
            if (coincidencias.length === 0) continue;

            if (def.avg) {
                const validos = coincidencias.filter(m => m.valor !== null);
                if (validos.length === 0) continue;
                const promedio = validos.reduce((s, m) => s + m.valor, 0) / validos.length;
                principal.push({
                    nombre:           def.label,
                    nombreOriginal:   coincidencias[0].nombreOriginal,
                    unidad:           coincidencias[0].unidad,
                    valor:            parseFloat(promedio.toFixed(1)),
                    decimals:         1,
                    canal:            null,
                    codigo:           coincidencias[0].codigo,
                    canalesAgregados: coincidencias.length,
                });
                coincidencias.forEach(m => usadasEnPrincipal.add(m));
            } else {
                const m = coincidencias[0];
                if (m.valor === null) continue;
                principal.push({ ...m, nombre: def.label });
                usadasEnPrincipal.add(m);
            }
        }

        const detalle = todasMetricas.filter(m => !usadasEnPrincipal.has(m));

        console.log(`[fieldclimate] clasificación final: ${principal.length} principal, ${detalle.length} detalle`);
        console.log('[fieldclimate] principal:', principal.map(m => `${m.nombre} = ${m.valor} ${m.unidad}`));

        return { principal, detalle, fecha: ultimaFecha };
    } catch (err) {
        logApiError('obtenerUltimaDatosEstacion', path, err);
        throw err;
    }
};
