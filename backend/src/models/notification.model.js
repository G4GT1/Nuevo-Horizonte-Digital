import mongoose from 'mongoose';

export const Notification = mongoose.model('Notification', new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El userId es requerido']
    },
    type: {
        type: String,
        enum: {
            values: [
                'alerta_sensor',
                'alerta_critica',
                'nuevo_usuario',
                'invitacion_aceptada',
                'resumen_semanal',
                'cuenta_suspendida',
                'cuenta_reactivada',
                'exportacion_lista',
                'umbral_creado',
                'umbral_eliminado'
            ],
            message: 'Tipo de notificación no válido'
        },
        required: [true, 'El tipo es requerido']
    },
    title: {
        type: String,
        required: [true, 'El título es requerido'],
        trim: true,
        maxlength: [150, 'El título no puede superar 150 caracteres']
    },
    message: {
        type: String,
        required: [true, 'El mensaje es requerido'],
        trim: true,
        maxlength: [500, 'El mensaje no puede superar 500 caracteres']
    },
    // Ruta del frontend a la que navegar al pulsar la notificación (opcional)
    link: {
        type: String,
        default: null
    },
    read: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true,
    collection: 'notifications',
    versionKey: false
}));
