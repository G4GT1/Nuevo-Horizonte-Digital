import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SECRET_KEY, FRONTEND_URL } from '../config.js';

let io = null;

export const getIo = () => io;

export const iniciarSockets = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: FRONTEND_URL ?? 'http://localhost:5173',
            credentials: true
        }
    });

    // Verificación JWT antes de aceptar la conexión
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('No autorizado: token requerido'));

        try {
            const payload = jwt.verify(token, SECRET_KEY);
            socket.user = payload;
            next();
        } catch {
            next(new Error('No autorizado: token inválido o expirado'));
        }
    });

    io.on('connection', (socket) => {
        const { _id, role } = socket.user;

        // Cada usuario tiene su room personal
        socket.join(`user:${_id}`);

        // El superadmin también escucha la room global de administración
        if (role === 'superadmin') socket.join('superadmin');

        console.log(`[Socket] Conectado: ${_id} (${role})`);

        socket.on('disconnect', () => {
            console.log(`[Socket] Desconectado: ${_id}`);
        });
    });

    console.log('Socket.io iniciado');
    return io;
};

// ── Helpers de emisión ─────────────────────────────────────────────────────

export const emitirActualizacionSensor = (datos) => {
    if (!io) return;
    io.emit('sensor:update', datos);
};

export const emitirAlertaNueva = (userId, datos) => {
    if (!io) return;
    io.to(`user:${userId}`).to('superadmin').emit('alerta:nueva', datos);
};

export const emitirNotificacionNueva = (userId, datos) => {
    if (!io) return;
    io.to(`user:${userId}`).emit('notificacion:nueva', datos);
};

export const emitirEstadoSistema = (datos) => {
    if (!io) return;
    io.to('superadmin').emit('sistema:estado', datos);
};
