import mongoose from 'mongoose';

export const User = mongoose.model('User', new mongoose.Schema({

    nombre: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [100, 'El nombre no puede superar 100 caracteres']
    },
    apellidos: {
        type: String,
        required: [true, 'Los apellidos son requeridos'],
        trim: true,
        minlength: [2, 'Los apellidos deben tener al menos 2 caracteres'],
        maxlength: [150, 'Los apellidos no pueden superar 150 caracteres']
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Debe proporcionar un email válido']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
        maxlength: [255]
    },
    role: {
        type: String,
        enum: {
            values: ['superadmin', 'tecnico', 'alumnado'],
            message: 'El rol debe ser: superadmin, tecnico o alumnado'
        },
        default: 'alumnado',
        required: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerifyToken: {
        type: String,
        default: null
    },
    emailVerifyTokenExpira: {
        type: Date,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordTokenExpira: {
        type: Date,
        default: null
    },
    suspended: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    preferences: {
        language: { type: String, enum: ['es', 'en'], default: 'es' },
        theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
        timezone: { type: String, default: 'Europe/Madrid' }
    },
    notifications: {
        push: { type: Boolean, default: true },
        emailCritical: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: true }
    }

}, {
    timestamps: true,
    collection: 'users',
    versionKey: false
}));
