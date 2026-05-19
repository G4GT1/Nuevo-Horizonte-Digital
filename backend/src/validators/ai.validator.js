import { body, validationResult } from 'express-validator';

const validationErrors = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errors: errores.array() });
    }
    next();
};

export const validarMensajeChat = [
    body('messages')
        .notEmpty().withMessage('El array de mensajes es requerido')
        .isArray({ min: 1 }).withMessage('Debe incluir al menos un mensaje'),
    body('messages.*.role')
        .isIn(['user', 'assistant']).withMessage('El rol del mensaje debe ser: user o assistant'),
    body('messages.*.content')
        .trim()
        .notEmpty().withMessage('El contenido del mensaje no puede estar vacío')
        .isLength({ max: 4000 }).withMessage('El mensaje no puede superar 4000 caracteres'),
    validationErrors
];

export const validarBusqueda = [
    body('pregunta')
        .trim()
        .notEmpty().withMessage('La pregunta es requerida')
        .isLength({ min: 3, max: 500 }).withMessage('La pregunta debe tener entre 3 y 500 caracteres'),
    validationErrors
];
