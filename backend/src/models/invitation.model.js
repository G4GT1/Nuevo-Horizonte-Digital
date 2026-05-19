import mongoose from 'mongoose';

export const Invitation = mongoose.model('Invitation', new mongoose.Schema({

    email: {
        type: String,
        required: [true, 'El email es requerido'],
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: {
            values: ['superadmin', 'tecnico', 'alumnado'],
            message: 'El rol debe ser: superadmin, tecnico o alumnado'
        },
        required: [true, 'El rol es requerido']
    },
    inviteToken: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    usedAt: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {
    timestamps: true,
    collection: 'invitations',
    versionKey: false
}));
