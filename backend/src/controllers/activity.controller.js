import { ActivityLog } from '../models/activityLog.model.js';
import { respuestaExito, respuestaError } from '../utils/respuestas.js';

export const getMiActividad = async (req, res) => {
    try {
        const { page = 1, limit = 30 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const [logs, total] = await Promise.all([
            ActivityLog.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            ActivityLog.countDocuments({ userId: req.user._id })
        ]);

        return respuestaExito(res, { logs, total, page: Number(page) });
    } catch (error) {
        return respuestaError(res, 'Error al obtener el historial de actividad', 500, error.message);
    }
};

export const getActividadGlobal = async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action } = req.query;

        const filtro = {};
        if (userId) filtro.userId = userId;
        if (action) filtro.action = action;

        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            ActivityLog.find(filtro)
                .populate('userId', 'nombre apellidos email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            ActivityLog.countDocuments(filtro)
        ]);

        return respuestaExito(res, { logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        return respuestaError(res, 'Error al obtener el log de actividad', 500, error.message);
    }
};
