import { ActivityLog } from '../models/activityLog.model.js';
import { respuestaExito, respuestaError } from '../utils/respuestas.js';

/**
 * GET /api/activity/me
 * Historial de actividad del usuario autenticado, paginado por fecha descendente.
 * @param {import('express').Request} req - query: { page, limit }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { logs, total, page }
 */
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

/**
 * GET /api/activity
 * Log global de actividad de todos los usuarios. Solo superadmin.
 * Incluye populate de userId (nombre, apellidos, email, role).
 * @param {import('express').Request} req - query: { page, limit, userId?, action? }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { logs, total, page, totalPages }
 */
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
