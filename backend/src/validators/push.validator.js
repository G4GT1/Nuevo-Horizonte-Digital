import { body, validationResult } from 'express-validator';

const validationErrors = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errors: errores.array() });
    }
    next();
};

export const validarSuscripcion = [
    body('subscription')
        .notEmpty().withMessage('El objeto de suscripción es requerido')
        .isObject().withMessage('La suscripción debe ser un objeto'),
    body('subscription.endpoint')
        .notEmpty().withMessage('El endpoint de la suscripción es requerido')
        .isURL().withMessage('El endpoint debe ser una URL válida'),
    body('subscription.keys.p256dh')
        .notEmpty().withMessage('La clave p256dh es requerida'),
    body('subscription.keys.auth')
        .notEmpty().withMessage('La clave auth es requerida'),
    validationErrors
];
