import mongoose from 'mongoose';
import axios from 'axios';
import {
    FIELDCLIMATE_BASE_URL, FIELDCLIMATE_PUBLIC_KEY, FIELDCLIMATE_PRIVATE_KEY,
    CESENS_BASE_URL, CESENS_NOMBRE, CESENS_CLAVE,
    GROQ_BASE_URL, GROQ_API_KEY, GROQ_MODEL
} from '../config.js';
import { generarCabecerasFieldClimate } from '../utils/hmac.js';

const medir = async (fn) => {
    const inicio = Date.now();
    try {
        await fn();
        return { status: 'ok', latencia: `${Date.now() - inicio}ms` };
    } catch (err) {
        console.error(`[Health] Fallo: ${err.message}`);
        return { status: 'error', latencia: `${Date.now() - inicio}ms`, detalle: err.message };
    }
};

const comprobarMongoDB = () => medir(async () => {
    if (mongoose.connection.readyState !== 1) throw new Error('MongoDB no conectado');
    await mongoose.connection.db.admin().ping();
});

const comprobarFieldClimate = () => medir(async () => {
    const path = '/user/stations';
    const cabeceras = generarCabecerasFieldClimate('GET', path, FIELDCLIMATE_PUBLIC_KEY, FIELDCLIMATE_PRIVATE_KEY);
    await axios.get(`${FIELDCLIMATE_BASE_URL}${path}`, { headers: cabeceras, timeout: 8000 });
});

const comprobarCesens = () => medir(async () => {
    await axios.post(`${CESENS_BASE_URL}/usuarios/login`, {
        nombre: CESENS_NOMBRE,
        clave: CESENS_CLAVE
    }, { timeout: 8000 });
});

const comprobarGroq = () => medir(async () => {
    await axios.post(`${GROQ_BASE_URL}/chat/completions`, {
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
    }, {
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 8000
    });
});

const calcularUptime = (segundos) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return `${h}h ${m}min`;
};

export const getHealth = async (req, res) => {
    const [mongodb, fieldclimate, cesens, groq] = await Promise.all([
        comprobarMongoDB(),
        comprobarFieldClimate(),
        comprobarCesens(),
        comprobarGroq()
    ]);

    const services = { mongodb, fieldclimate, cesens, groq };

    const todoOk = Object.values(services).every(s => s.status === 'ok');
    const mongoFalla = mongodb.status === 'error';

    const statusGlobal = mongoFalla ? 'error' : todoOk ? 'ok' : 'degraded';
    const httpStatus = mongoFalla ? 503 : 200;

    if (!todoOk) {
        const fallidos = Object.entries(services).filter(([, s]) => s.status === 'error').map(([k]) => k);
        console.warn(`[Health] Servicios degradados: ${fallidos.join(', ')}`);
    }

    return res.status(httpStatus).json({
        status: statusGlobal,
        timestamp: new Date().toISOString(),
        uptime: calcularUptime(Math.floor(process.uptime())),
        version: '1.0.0',
        services
    });
};
