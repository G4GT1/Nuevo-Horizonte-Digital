import { Notification } from '../models/notification.model.js';
import { respuestaExito, respuestaError, respuestaNoEncontrado } from '../utils/respuestas.js';

export const getNotificaciones = async (req, res) => {
    try {
        const { page = 1, limit = 30, unread } = req.query;
        const filtro = { userId: req.user._id };
        if (unread === 'true') filtro.read = false;

        const skip = (Number(page) - 1) * Number(limit);
        const [notificaciones, total, noLeidas] = await Promise.all([
            Notification.find(filtro).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Notification.countDocuments(filtro),
            Notification.countDocuments({ userId: req.user._id, read: false })
        ]);

        return respuestaExito(res, { notificaciones, total, noLeidas, page: Number(page) });
    } catch (error) {
        return respuestaError(res, 'Error al obtener las notificaciones', 500, error.message);
    }
};

export const marcarLeida = async (req, res) => {
    try {
        const notificacion = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
        if (!notificacion) return respuestaNoEncontrado(res, 'Notificación no encontrada');

        await Notification.findByIdAndUpdate(req.params.id, { read: true });

        return respuestaExito(res, { message: 'Notificación marcada como leída.' });
    } catch (error) {
        return respuestaError(res, 'Error al actualizar la notificación', 500, error.message);
    }
};

export const marcarTodasLeidas = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
        return respuestaExito(res, { message: 'Todas las notificaciones marcadas como leídas.' });
    } catch (error) {
        return respuestaError(res, 'Error al actualizar las notificaciones', 500, error.message);
    }
};

export const eliminarNotificacion = async (req, res) => {
    try {
        const notificacion = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!notificacion) return respuestaNoEncontrado(res, 'Notificación no encontrada');
        return respuestaExito(res, { message: 'Notificación eliminada.' });
    } catch (error) {
        return respuestaError(res, 'Error al eliminar la notificación', 500, error.message);
    }
};
