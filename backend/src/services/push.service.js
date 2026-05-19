import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '../config.js';
import { PushSubscription } from '../models/pushSubscription.model.js';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const enviarNotificacionPush = async (subscription, payload) => {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
};

export const enviarNotificacionATodos = async (suscripciones, payload) => {
    const promesas = suscripciones.map(async (sub) => {
        try {
            await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
        } catch (error) {
            // Suscripción expirada o inválida — eliminar de BD
            if (error.statusCode === 410 || error.statusCode === 404) {
                await PushSubscription.findByIdAndDelete(sub._id);
            }
        }
    });
    await Promise.allSettled(promesas);
};
