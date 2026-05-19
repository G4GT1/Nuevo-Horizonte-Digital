import jwt from 'jsonwebtoken';
import { SECRET_KEY, REFRESH_SECRET_KEY } from '../config.js';

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

export const generarAccessToken = (payload) => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generarRefreshToken = (payload) => {
    return jwt.sign(payload, REFRESH_SECRET_KEY, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET_KEY, (err, usuario) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido o expirado' });
        }
        req.user = usuario;
        next();
    });
};

export const verificarRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_SECRET_KEY);
    } catch {
        throw new Error('Refresh token inválido o expirado');
    }
};

export const autorizarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permiso para acceder a esta ruta' });
        }
        next();
    };
};
