import mongoose from 'mongoose';

export const ActivityLog = mongoose.model('ActivityLog', new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El userId es requerido']
    },
    action: {
        type: String,
        enum: {
            values: [
                'login',
                'logout',
                'register',
                'email_verificado',
                'password_reset_solicitado',
                'password_reset',
                'perfil_actualizado',
                'preferencias_actualizadas',
                'alerta_config_creada',
                'alerta_config_actualizada',
                'alerta_config_eliminada',
                'alerta_resuelta',
                'exportacion_pdf',
                'exportacion_excel',
                'push_suscripcion',
                'push_desuscripcion',
                'usuario_creado',
                'usuario_actualizado',
                'usuario_eliminado',
                'rol_cambiado',
                'usuario_suspendido',
                'usuario_reactivado',
                'invitacion_enviada',
                'invitacion_aceptada'
            ],
            message: 'Acción de log no válida'
        },
        required: [true, 'La acción es requerida']
    },
    ip: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    // Información adicional variable según la acción (email cambiado, rol anterior, etc.)
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }

}, {
    timestamps: true,
    collection: 'activityLogs',
    versionKey: false
}));
