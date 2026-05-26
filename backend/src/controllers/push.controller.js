import { PushSubscription } from '../models/pushSubscription.model.js';
import { registrarActividad } from '../utils/actividad.js';
import { respuestaExito, respuestaCreado, respuestaError } from '../utils/respuestas.js';

/**
 * POST /api/push/subscribe
 * Registra o actualiza una suscripcion VAPID del navegador para notificaciones push.
 * Usa upsert por endpoint para evitar duplicados.
 * @param {import('express').Request} req - body: { subscription: { endpoint, keys } }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 201 con mensaje de confirmacion
 */
export const suscribir = async (req, res) => {
    try {
        const { subscription } = req.body;

        await PushSubscription.findOneAndUpdate(
            { 'subscription.endpoint': subscription.endpoint },
            { userId: req.user._id, subscription },
            { upsert: true, new: true, runValidators: true }
        );

        await registrarActividad(req.user._id, 'push_suscripcion', req);

        return respuestaCreado(res, { message: 'Suscripción push registrada.' });
    } catch (error) {
        return respuestaError(res, 'Error al guardar la suscripción', 500, error.message);
    }
};

/**
 * DELETE /api/push/unsubscribe
 * Elimina la suscripcion push del endpoint indicado para el usuario autenticado.
 * @param {import('express').Request} req - body: { endpoint: string }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con mensaje de confirmacion
 */
export const desuscribir = async (req, res) => {
    try {
        const { endpoint } = req.body;

        await PushSubscription.findOneAndDelete({
            userId: req.user._id,
            'subscription.endpoint': endpoint
        });

        await registrarActividad(req.user._id, 'push_desuscripcion', req);

        return respuestaExito(res, { message: 'Suscripción eliminada.' });
    } catch (error) {
        return respuestaError(res, 'Error al eliminar la suscripción', 500, error.message);
    }
};
