import { body, param, validationResult } from 'express-validator';

const validationErrors = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errors: errores.array() });
    }
    next();
};

export const validarRegistro = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios'),
    body('apellidos')
        .trim()
        .notEmpty().withMessage('Los apellidos son requeridos')
        .isLength({ min: 2, max: 150 }).withMessage('Los apellidos deben tener entre 2 y 150 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Debe proporcionar un email válido')
        .isLength({ max: 150 }).withMessage('El email no puede superar 150 caracteres')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    validationErrors
];

export const validarLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida'),
    validationErrors
];

export const validarForgotPassword = [
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    validationErrors
];

export const validarResetPassword = [
    body('token')
        .notEmpty().withMessage('El token es requerido'),
    body('password')
        .notEmpty().withMessage('La nueva contraseña es requerida')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    validationErrors
];

export const validarToken = [
    param('token')
        .notEmpty().withMessage('El token es requerido'),
    validationErrors
];

export const validarAceptarInvitacion = [
    body('token')
        .notEmpty().withMessage('El token de invitación es requerido'),
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('apellidos')
        .trim()
        .notEmpty().withMessage('Los apellidos son requeridos')
        .isLength({ min: 2, max: 150 }).withMessage('Los apellidos deben tener entre 2 y 150 caracteres'),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    validationErrors
];
