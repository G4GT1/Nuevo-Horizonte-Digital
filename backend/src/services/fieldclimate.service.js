import axios from 'axios';
import { generarCabecerasFieldClimate } from '../utils/hmac.js';
import { FIELDCLIMATE_BASE_URL, FIELDCLIMATE_PUBLIC_KEY, FIELDCLIMATE_PRIVATE_KEY } from '../config.js';

const cliente = axios.create({ baseURL: FIELDCLIMATE_BASE_URL });

const cabeceras = (method, path) =>
    generarCabecerasFieldClimate(method, path, FIELDCLIMATE_PUBLIC_KEY, FIELDCLIMATE_PRIVATE_KEY);

export const obtenerEstaciones = async () => {
    const path = '/user/stations';
    const { data } = await cliente.get(path, { headers: cabeceras('GET', path) });
    return data;
};

export const obtenerDatosEstacion = async (stationId, from, to) => {
    const path = `/data/${stationId}/raw`;
    const { data } = await cliente.get(path, {
        headers: cabeceras('GET', path),
        params: { from, to }
    });
    return data;
};

export const obtenerUltimaDatosEstacion = async (stationId) => {
    const path = `/data/${stationId}/last/1`;
    const { data } = await cliente.get(path, { headers: cabeceras('GET', path) });
    return data;
};
