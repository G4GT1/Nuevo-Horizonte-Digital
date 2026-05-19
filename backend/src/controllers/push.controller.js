import { PushSubscription } from '../models/pushSubscription.model.js';
import { registrarActividad } from '../utils/actividad.js';
import { respuestaExito, respuestaCreado, respuestaError } from '../utils/respuestas.js';

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
