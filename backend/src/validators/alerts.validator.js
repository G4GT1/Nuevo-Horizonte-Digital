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
        .notEmpty().withMessage('La métrica es requerida')
        .isIn(['temperature', 'humidity', 'vwc', 'battery', 'connection'])
        .withMessage('La métrica debe ser: temperature, humidity, vwc, battery o connection'),
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
