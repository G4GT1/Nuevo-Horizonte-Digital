import mongoose from 'mongoose';

export const PushSubscription = mongoose.model('PushSubscription', new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El userId es requerido']
    },
    // Objeto de suscripción tal como lo devuelve el navegador
    subscription: {
        endpoint: {
            type: String,
            required: [true, 'El endpoint de suscripción es requerido'],
            unique: true
        },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true }
        }
    }

}, {
    timestamps: true,
    collection: 'pushSubscriptions',
    versionKey: false
}));
