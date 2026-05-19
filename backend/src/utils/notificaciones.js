import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';

export const crearNotificacion = async (userId, type, title, message, link = null) => {
    try {
        await Notification.create({ userId, type, title, message, link });
    } catch {
        // Las notificaciones nunca deben interrumpir el flujo principal
    }
};

export const notificarSuperadmins = async (type, title, message, link = null) => {
    try {
        const superadmins = await User.find({ role: 'superadmin' }).select('_id');
        if (!superadmins.length) return;
        const notificaciones = superadmins.map(sa => ({ userId: sa._id, type, title, message, link }));
        await Notification.insertMany(notificaciones);
    } catch {
        // Las notificaciones nunca deben interrumpir el flujo principal
    }
};

export const notificarPorRol = async (roles, type, title, message, link = null) => {
    try {
        const usuarios = await User.find({ role: { $in: roles } }).select('_id');
        if (!usuarios.length) return;
        const notificaciones = usuarios.map(u => ({ userId: u._id, type, title, message, link }));
        await Notification.insertMany(notificaciones);
    } catch {
        // Las notificaciones nunca deben interrumpir el flujo principal
    }
};
