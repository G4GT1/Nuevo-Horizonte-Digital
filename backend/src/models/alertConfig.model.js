import mongoose from 'mongoose';

export const AlertConfig = mongoose.model('AlertConfig', new mongoose.Schema({

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
    source: {
        type: String,
        enum: {
            values: ['fieldclimate', 'cesens'],
            message: 'La fuente debe ser: fieldclimate o cesens'
        },
        required: [true, 'La fuente de datos es requerida']
    },
    metric: {
        type: String,
        enum: {
            values: ['temperature', 'humidity', 'vwc', 'battery', 'connection'],
            message: 'La métrica debe ser: temperature, humidity, vwc, battery o connection'
        },
        required: [true, 'La métrica es requerida']
    },
    operator: {
        type: String,
        enum: {
            values: ['gt', 'lt', 'eq'],
            message: 'El operador debe ser: gt, lt o eq'
        },
        required: [true, 'El operador de comparación es requerido']
    },
    threshold: {
        type: Number,
        required: [true, 'El umbral es requerido']
    },
    active: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true,
    collection: 'alertConfigs',
    versionKey: false
}));
