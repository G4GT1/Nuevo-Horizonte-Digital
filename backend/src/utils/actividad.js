import { ActivityLog } from '../models/activityLog.model.js';

export const registrarActividad = async (userId, action, req, details = {}) => {
    try {
        const ip = req?.headers?.['x-forwarded-for']?.split(',')[0] ?? req?.ip ?? null;
        const userAgent = req?.headers?.['user-agent'] ?? null;
        await ActivityLog.create({ userId, action, ip, userAgent, details });
    } catch {
        // El log nunca debe interrumpir el flujo principal
    }
};
