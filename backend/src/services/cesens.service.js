import axios from 'axios';
import { CESENS_BASE_URL, CESENS_NOMBRE, CESENS_CLAVE } from '../config.js';
import { rangoFechasCesens } from '../utils/fechas.js';

const cliente = axios.create({ baseURL: CESENS_BASE_URL });

let tokenCesens = null;

const basicAuth = `Basic ${Buffer.from(`${CESENS_NOMBRE}:${CESENS_CLAVE}`).toString('base64')}`;

const login = async () => {
    const { data } = await cliente.post('/usuarios/login', {
        nombre: CESENS_NOMBRE,
        clave: CESENS_CLAVE
    });
    tokenCesens = data.auth;
    return tokenCesens;
};

const obtenerToken = async () => {
    if (tokenCesens) return tokenCesens;
    return await login();
};

const peticionConRetry = async (fn) => {
    try {
        return await fn(await obtenerToken());
    } catch (error) {
        if (error.response?.status !== 401) throw error;
        tokenCesens = null;
        return await fn(await login());
    }
};

// ── Mapa local de métricas (fallback) ─────────────────────────────────────
// Nombres en español que coinciden con getIconoMetrica del frontend

const MAPA_METRICAS_CS = {
    1:  { nombre: 'Temperatura',                           unidad: '°C',  decimals: 1 },
    2:  { nombre: 'Humectación Foliar',                    unidad: '',    decimals: 0 },
    6:  { nombre: 'Humedad Relativa',                      unidad: '%',   decimals: 0 },
    8:  { nombre: 'Presión Atmosférica',                   unidad: 'hPa', decimals: 1 },
    12: { nombre: 'Batería / Señal Nodo',                  unidad: '',    decimals: 0 },
    14: { nombre: 'Parámetro Nodo',                        unidad: '',    decimals: 0 },
    28: { nombre: 'Contenido Volumétrico Agua Suelo 20cm', unidad: '%',   decimals: 1 },
    78: { nombre: 'Parámetro Adicional',                   unidad: '',    decimals: 0 },
    95: { nombre: 'Cesens Mini 1',                         unidad: '',    decimals: 1 },
    96: { nombre: 'Cesens Mini 2',                         unidad: '',    decimals: 1 },
};

// ── Cache de definiciones ─────────────────────────────────────────────────

let _cacheMetricas = null;
let _cacheTsMetricas = 0;

export const obtenerDefinicionMetricas = async () => {
    if (_cacheMetricas && Date.now() - _cacheTsMetricas < 3_600_000) return _cacheMetricas;

    try {
        const raw = await peticionConRetry(async (token) => {
            const { data } = await cliente.get('/metricas/cliente', {
                headers: { 'Authentication': `Token ${token}`, 'Authorization': basicAuth }
            });
            return data;
        });

        if (Array.isArray(raw) && raw.length > 0) {
            const defs = {};
            raw.forEach(m => {
                const id = Number(m.id ?? m.idMetrica ?? m.id_metrica);
                if (!id) return;
                defs[id] = {
                    nombre:   m.nombre ?? m.name ?? m.descripcion ?? MAPA_METRICAS_CS[id]?.nombre ?? `Métrica ${id}`,
                    unidad:   m.unidad ?? m.unit ?? m.ud ?? MAPA_METRICAS_CS[id]?.unidad ?? '',
                    decimals: typeof (m.decimales ?? m.decimals) === 'number'
                        ? (m.decimales ?? m.decimals)
                        : (MAPA_METRICAS_CS[id]?.decimals ?? 1),
                };
            });
            if (Object.keys(defs).length > 0) {
                _cacheMetricas = defs;
                _cacheTsMetricas = Date.now();
                console.log(`[cesens] definiciones del API: ${Object.keys(defs).length} métricas`);
                return _cacheMetricas;
            }
        }
    } catch (err) {
        console.warn(`[cesens] /metricas/cliente (${err.response?.status ?? err.message}), usando mapa local`);
    }

    _cacheMetricas = MAPA_METRICAS_CS;
    _cacheTsMetricas = Date.now();
    console.log(`[cesens] usando mapa local: ${Object.keys(MAPA_METRICAS_CS).length} métricas`);
    return _cacheMetricas;
};

// ── Estaciones ─────────────────────────────────────────────────────────────

export const obtenerEstaciones = async () => {
    return peticionConRetry(async (token) => {
        const { data } = await cliente.get('/ubicaciones/cliente', {
            headers: { 'Authentication': `Token ${token}`, 'Authorization': basicAuth }
        });
        return data;
    });
};

// Enriquece cada estación con un campo meta compatible con el formato FC
// Métricas: 1=Temperatura Aire, 6=Humedad Relativa, 12=Batería/Señal, 28=Humedad Suelo
export const obtenerEstacionesConMeta = async () => {
    const estaciones = await obtenerEstaciones();
    if (!Array.isArray(estaciones) || estaciones.length === 0) return estaciones ?? [];

    const hoy = new Date();
    const enriquecidas = await Promise.allSettled(
        estaciones.map(async (st) => {
            try {
                const [datos1, datos6, datos12, datos28] = await Promise.all([
                    obtenerDatosMetrica(st.id, 1,  hoy, hoy),
                    obtenerDatosMetrica(st.id, 6,  hoy, hoy),
                    obtenerDatosMetrica(st.id, 12, hoy, hoy),
                    obtenerDatosMetrica(st.id, 28, hoy, hoy),
                ]);
                const meta = {};
                if (datos1.length  > 0) meta.airTemp     = datos1[datos1.length   - 1].valor;
                if (datos6.length  > 0) meta.rh           = datos6[datos6.length   - 1].valor;
                if (datos12.length > 0) meta.battery      = datos12[datos12.length - 1].valor;
                if (datos28.length > 0) meta.soilMoisture = datos28[datos28.length - 1].valor;
                return { ...st, meta };
            } catch {
                return st;
            }
        })
    );
    return enriquecidas.map((r, i) => r.status === 'fulfilled' ? r.value : estaciones[i]);
};

// ── Datos por métrica (raw) ────────────────────────────────────────────────

export const obtenerDatosMetrica = async (idUbicacion, idMetrica, desde, hasta) => {
    const rango = rangoFechasCesens(desde, hasta);
    const raw = await peticionConRetry(async (token) => {
        const { data } = await cliente.get(`/datos/${idUbicacion}/${idMetrica}/${rango}`, {
            headers: { 'Authentication': `Token ${token}` }
        });
        return data;
    });
    // API returns {"unix_ts_string": numeric_value} — parse to sorted array
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return Object.entries(raw)
            .map(([ts, valor]) => ({ ts: Number(ts), valor: valor !== null && valor !== undefined ? Number(valor) : null }))
            .filter(p => p.valor !== null && !isNaN(p.valor))
            .sort((a, b) => a.ts - b.ts);
    }
    return [];
};

// ── Última lectura normalizada ─────────────────────────────────────────────
// Devuelve { principal, detalle: [], fecha } — mismo formato que FC

export const obtenerUltimaLecturaEstacion = async (idUbicacion) => {
    const defs = await obtenerDefinicionMetricas();
    const idsMetrica = Object.keys(defs).map(Number);

    // Use today's date for both bounds — current readings
    const hoy = new Date();

    console.log(`[cesens] obtenerUltimaLecturaEstacion id=${idUbicacion}, ${idsMetrica.length} métricas`);

    const resultados = await Promise.allSettled(
        idsMetrica.map(id => obtenerDatosMetrica(idUbicacion, id, hoy, hoy))
    );

    let ultimaFecha = null;
    const principal = [];

    resultados.forEach((r, i) => {
        if (r.status === 'rejected') return;
        // obtenerDatosMetrica now returns sorted [{ts, valor}] array, already filtered non-null
        const datos = Array.isArray(r.value) ? r.value : [];
        if (datos.length === 0) return;

        const ultimoPunto = datos[datos.length - 1];
        const valorRaw = ultimoPunto.valor;
        if (valorRaw === null || valorRaw === undefined) return;

        const id       = idsMetrica[i];
        const def      = defs[id];
        const decimals = def.decimals ?? 1;

        const fechaIso = new Date(ultimoPunto.ts * 1000).toISOString();
        if (!ultimaFecha || fechaIso > ultimaFecha) ultimaFecha = fechaIso;

        principal.push({
            idMetrica:      id,
            nombre:         def.nombre,
            nombreOriginal: def.nombre,
            unidad:         def.unidad,
            valor:          parseFloat(Number(valorRaw).toFixed(decimals)),
            decimals,
            canal:          null,
            codigo:         String(id),
        });
    });

    principal.sort((a, b) => a.idMetrica - b.idMetrica);
    console.log(`[cesens] ${principal.length} métricas con datos`);
    return { principal, detalle: [], fecha: ultimaFecha };
};

// ── Histórico con nombres ──────────────────────────────────────────────────

export const obtenerDatosHistorico = async (idUbicacion, idsMetrica, desde, hasta) => {
    const defs = await obtenerDefinicionMetricas();
    const resultados = await Promise.allSettled(
        idsMetrica.map(id => obtenerDatosMetrica(idUbicacion, id, desde, hasta))
    );
    return resultados.map((r, i) => ({
        idMetrica: idsMetrica[i],
        nombre:    defs[idsMetrica[i]]?.nombre ?? `Métrica ${idsMetrica[i]}`,
        unidad:    defs[idsMetrica[i]]?.unidad ?? '',
        // r.value is already [{ts, valor}] sorted array from obtenerDatosMetrica
        datos:     r.status === 'fulfilled' ? (r.value ?? []) : null,
        error:     r.status === 'rejected'  ? r.reason?.message : null,
    }));
};

// Backwards compat
export const obtenerUltimosDatos = async (idUbicacion, metricas) => {
    const hoy = new Date();
    const resultados = await Promise.allSettled(
        metricas.map(id => obtenerDatosMetrica(idUbicacion, id, hoy, hoy))
    );
    return resultados.map((r, i) => {
        if (r.status === 'rejected') return { idMetrica: metricas[i], datos: null, error: r.reason?.message };
        const todos = r.value ?? [];
        return { idMetrica: metricas[i], datos: todos.length > 0 ? [todos[todos.length - 1]] : [], error: null };
    });
};
