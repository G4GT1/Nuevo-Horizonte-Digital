import { body, param, validationResult } from 'express-validator';

const validationErrors = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errors: errores.array() });
    }
    next();
};

export const validarId = [
    param('id')
        .notEmpty().withMessage('El ID es requerido')
        .isMongoId().withMessage('El ID debe ser un ObjectId válido de MongoDB'),
    validationErrors
];

export const validarCrearUsuario = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('apellidos')
        .trim()
        .notEmpty().withMessage('Los apellidos son requeridos')
        .isLength({ min: 2, max: 150 }).withMessage('Los apellidos deben tener entre 2 y 150 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('role')
        .optional()
        .isIn(['superadmin', 'tecnico', 'alumnado']).withMessage('El rol debe ser: superadmin, tecnico o alumnado'),
    validationErrors
];

export const validarActualizarUsuario = [
    body('nombre')
        .optional().trim()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('apellidos')
        .optional().trim()
        .isLength({ min: 2, max: 150 }).withMessage('Los apellidos deben tener entre 2 y 150 caracteres'),
    body('email')
        .optional().trim()
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    validationErrors
];

export const validarCambiarRol = [
    body('role')
        .notEmpty().withMessage('El rol es requerido')
        .isIn(['superadmin', 'tecnico', 'alumnado']).withMessage('El rol debe ser: superadmin, tecnico o alumnado'),
    validationErrors
];

export const validarEnviarInvitacion = [
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    body('role')
        .notEmpty().withMessage('El rol es requerido')
        .isIn(['superadmin', 'tecnico', 'alumnado']).withMessage('El rol debe ser: superadmin, tecnico o alumnado'),
    validationErrors
];
