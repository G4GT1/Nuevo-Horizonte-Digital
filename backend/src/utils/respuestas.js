// Helpers de respuestas HTTP estandarizadas
// Uso en controladores: return respuestaExito(res, datos) en vez de res.status(200).json(...)

export const respuestaExito = (res, data, status = 200) => {
    return res.status(status).json({ data });
};

export const respuestaCreado = (res, data) => {
    return res.status(201).json({ data });
};

export const respuestaError = (res, message, status = 500, error = null) => {
    const body = { message };
    if (error && process.env.NODE_ENV === 'development') body.error = error;
    return res.status(status).json(body);
};

export const respuestaNoEncontrado = (res, message = 'Recurso no encontrado') => {
    return res.status(404).json({ message });
};

export const respuestaNoAutorizado = (res, message = 'No autorizado') => {
    return res.status(401).json({ message });
};

export const respuestaForbidden = (res, message = 'No tienes permiso para realizar esta acción') => {
    return res.status(403).json({ message });
};
