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

export const validarConfigAlerta = [
    body('stationId')
        .trim()
        .notEmpty().withMessage('El stationId es requerido'),
    body('source')
        .notEmpty().withMessage('La fuente de datos es requerida')
        .isIn(['fieldclimate', 'cesens']).withMessage('La fuente debe ser: fieldclimate o cesens'),
    body('metric')
        .trim()
        .notEmpty().withMessage('La métrica es requerida')
        .isString().withMessage('La métrica debe ser un texto')
        .isLength({ min: 1, max: 200 }).withMessage('La métrica debe tener entre 1 y 200 caracteres'),
    body('operator')
        .notEmpty().withMessage('El operador es requerido')
        .isIn(['gt', 'lt', 'eq']).withMessage('El operador debe ser: gt, lt o eq'),
    body('threshold')
        .notEmpty().withMessage('El umbral es requerido')
        .isNumeric().withMessage('El umbral debe ser un número'),
    body('active')
        .optional()
        .isBoolean().withMessage('El campo active debe ser un booleano'),
    validationErrors
];
