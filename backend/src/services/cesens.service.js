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

// Reintenta la petición una vez si el token ha caducado (401)
const peticionConRetry = async (fn) => {
    try {
        return await fn(await obtenerToken());
    } catch (error) {
        if (error.response?.status !== 401) throw error;
        tokenCesens = null;
        return await fn(await login());
    }
};

export const obtenerEstaciones = async () => {
    return peticionConRetry(async (token) => {
        const { data } = await cliente.get('/ubicaciones/cliente', {
            headers: {
                'Authentication': `Token ${token}`,
                'Authorization': basicAuth
            }
        });
        return data;
    });
};

export const obtenerDatosMetrica = async (idUbicacion, idMetrica, desde, hasta) => {
    const rango = rangoFechasCesens(desde, hasta);
    return peticionConRetry(async (token) => {
        const { data } = await cliente.get(`/datos/${idUbicacion}/${idMetrica}/${rango}`, {
            headers: { 'Authentication': `Token ${token}` }
        });
        return data;
    });
};

export const obtenerUltimosDatos = async (idUbicacion, metricas) => {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const peticiones = metricas.map(id => obtenerDatosMetrica(idUbicacion, id, ayer, hoy));
    const resultados = await Promise.allSettled(peticiones);

    return resultados.map((r, i) => ({
        idMetrica: metricas[i],
        datos: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason?.message : null
    }));
};
