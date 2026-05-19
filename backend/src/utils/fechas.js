// Formatea una fecha al formato YYYYMMDD que usa Cesens en sus endpoints
// Ejemplo: new Date() → "20260519"
export const formatearFechaCesens = (fecha = new Date()) => {
    const d = new Date(fecha);
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}${mes}${dia}`;
};

// Devuelve el rango de la última semana en formato Cesens: "YYYYMMDD-YYYYMMDD"
export const rangoUltimaSemana = () => {
    const hoy = new Date();
    const haceUnaSemana = new Date(hoy);
    haceUnaSemana.setDate(hoy.getDate() - 7);
    return `${formatearFechaCesens(haceUnaSemana)}-${formatearFechaCesens(hoy)}`;
};

// Devuelve el rango de fechas en formato Cesens a partir de strings YYYY-MM-DD
export const rangoFechasCesens = (desde, hasta) => {
    return `${formatearFechaCesens(new Date(desde))}-${formatearFechaCesens(new Date(hasta))}`;
};

// Convierte un timestamp Unix (segundos) a Date
export const unixAFecha = (timestamp) => new Date(timestamp * 1000);

// Formatea una fecha a ISO 8601 en zona horaria de Madrid (para mostrar al usuario)
export const formatearFechaMadrid = (fecha = new Date()) => {
    return new Date(fecha).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
};
