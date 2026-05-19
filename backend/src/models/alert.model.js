import mongoose from 'mongoose';

export const Alert = mongoose.model('Alert', new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El userId es requerido']
    },
    stationId: {
        type: String,
        required: [true, 'El stationId es requerido'],
        trim: true
    },
    stationName: {
        type: String,
        required: [true, 'El nombre de la estación es requerido'],
        trim: true
    },
    type: {
        type: String,
        enum: {
            values: ['critical', 'warning', 'info'],
            message: 'El tipo debe ser: critical, warning o info'
        },
        required: [true, 'El tipo de alerta es requerido']
    },
    metric: {
        type: String,
        required: [true, 'La métrica es requerida'],
        trim: true
    },
    value: {
        type: Number,
        required: [true, 'El valor medido es requerido']
    },
    threshold: {
        type: Number,
        required: [true, 'El umbral configurado es requerido']
    },
    message: {
        type: String,
        required: [true, 'El mensaje descriptivo es requerido'],
        trim: true
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'resolved'],
            message: 'El estado debe ser: active o resolved'
        },
        default: 'active'
    },
    resolvedAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true,
    collection: 'alerts',
    versionKey: false
}));
