import { Router } from 'express';
import { getEstaciones, getEstacion, getDatosActuales, getHistorico } from '../controllers/stations.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/stations:
 *   get:
 *     summary: Listar todas las estaciones (FieldClimate + Cesens)
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array de estaciones con campo `source` (fieldclimate | cesens)
 */
router.get('/', autenticarToken, getEstaciones);

/**
 * @swagger
 * /api/stations/{id}:
 *   get:
 *     summary: Detalle de una estación
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [fieldclimate, cesens]
 *     responses:
 *       200:
 *         description: Datos de la estación
 *       400:
 *         description: Falta el parámetro source
 */
router.get('/:id', autenticarToken, getEstacion);

/**
 * @swagger
 * /api/stations/{id}/data:
 *   get:
 *     summary: Datos actuales del sensor
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [fieldclimate, cesens]
 *     responses:
 *       200:
 *         description: Última lectura de todos los sensores de la estación
 */
router.get('/:id/data', autenticarToken, getDatosActuales);

/**
 * @swagger
 * /api/stations/{id}/history:
 *   get:
 *     summary: Histórico de datos de una estación
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [fieldclimate, cesens]
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2025-01-01'
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2025-01-31'
 *     responses:
 *       200:
 *         description: Datos históricos del rango solicitado
 */
router.get('/:id/history', autenticarToken, getHistorico);

export { router as stationsRoutes };
