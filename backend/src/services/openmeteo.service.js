import axios from 'axios';
import { OPENMETEO_BASE_URL, STATION_LATITUDE, STATION_LONGITUDE } from '../config.js';

export const obtenerPrediccion = async (lat = STATION_LATITUDE, lon = STATION_LONGITUDE) => {
    const { data } = await axios.get(`${OPENMETEO_BASE_URL}/forecast`, {
        params: {
            latitude: lat,
            longitude: lon,
            hourly: 'temperature_2m,precipitation,windspeed_10m,relativehumidity_2m',
            current_weather: true,
            timezone: 'Europe/Madrid',
            forecast_days: 7
        }
    });
    return data;
};
