import StationMeta from '../models/stationMeta.model.js';

const FC_COORDS = [
    { stationId: '03110CE1', lat: 37.9118, lon: -4.7108 }, // Base sonda 80cm
    { stationId: '03111658', lat: 37.9121, lon: -4.7102 }, // Estacion Clima 80cm
    { stationId: '04C12407', lat: 37.9115, lon: -4.7098 }, // Invernadero
    { stationId: '05016076', lat: 37.9124, lon: -4.7112 }, // Invernadero Agricola
    { stationId: '07212DF6', lat: 37.9119, lon: -4.7095 }, // iSCOUT
    { stationId: '0721674A', lat: 37.9113, lon: -4.7105 }, // Controlador de trampas
    { stationId: '07D11F60', lat: 37.9126, lon: -4.7099 }, // Camara
    { stationId: '07D15F8C', lat: 37.9116, lon: -4.7115 }, // p3ix5
];

export const seedStationMeta = async () => {
    const ops = FC_COORDS.map(({ stationId, lat, lon }) =>
        StationMeta.findOneAndUpdate(
            { stationId, source: 'fieldclimate' },
            { lat, lon },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
    );
    const results = await Promise.allSettled(ops);
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.length - ok;
    console.log(`[seedStationMeta] ${ok}/${FC_COORDS.length} coordenadas FieldClimate insertadas/actualizadas${fail > 0 ? ` (${fail} errores)` : ''}`);
};
