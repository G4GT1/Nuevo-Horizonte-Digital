import jwt from 'jsonwebtoken';
import { SECRET_KEY, REFRESH_SECRET_KEY } from '../config.js';

export const ACCESS_TOKEN_EXPIRY = '2h';
export const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Genera un JWT de acceso (TTL: 2h).
 * @param {{ _id: string, role: string, email: string }} payload
 * @returns {string}
 */
export const generarAccessToken = (payload) => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

/**
 * Genera un JWT de refresco (TTL: 7d). Se guarda en cookie httpOnly.
 * @param {{ _id: string, role: string, email: string }} payload
 * @returns {string}
 */
export const generarRefreshToken = (payload) => {
    return jwt.sign(payload, REFRESH_SECRET_KEY, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

/**
 * Middleware Express: verifica el Bearer JWT del header Authorization.
 * Asigna el payload decodificado a req.user. Responde 401/403 si el token falta, expira o es invalido.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET_KEY, (err, usuario) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado' });
            }
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = usuario;
        next();
    });
};

/**
 * Verifica y decodifica un refresh token. Lanza Error si es invalido o expirado.
 * @param {string} token
 * @returns {{ _id: string, role: string, email: string }}
 */
export const verificarRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_SECRET_KEY);
    } catch {
        throw new Error('Refresh token inválido o expirado');
    }
};

/**
 * Middleware Express: comprueba que req.user.role este en la lista de roles permitidos.
 * Debe usarse despues de autenticarToken.
 * @param {string[]} rolesPermitidos - ej. ['superadmin', 'tecnico']
 * @returns {import('express').RequestHandler}
 */
export const autorizarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permiso para acceder a esta ruta' });
        }
        next();
    };
};
