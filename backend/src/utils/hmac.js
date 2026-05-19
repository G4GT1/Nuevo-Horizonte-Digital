import crypto from 'crypto';

// Genera las cabeceras de autenticación HMAC-SHA256 para FieldClimate API v2
// Firma: HMAC-SHA256(METHOD + PATH + REQUEST-DATE + PUBLIC_KEY, PRIVATE_KEY)
export const generarCabecerasFieldClimate = (method, path, publicKey, privateKey) => {
    const fecha = new Date().toUTCString();
    const contenido = method.toUpperCase() + path + fecha + publicKey;
    const firma = crypto.createHmac('sha256', privateKey).update(contenido).digest('hex');

    return {
        'Authorization': `hmac ${publicKey}:${firma}`,
        'Request-Date': fecha,
        'Content-Type': 'application/json'
    };
};
