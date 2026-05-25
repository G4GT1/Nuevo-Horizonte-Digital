import { Router } from 'express';
import {
    getEstaciones,
    getEstacion,
    getDatosActuales,
    getHistorico,
    getEstacionesFC,
    getEstacionFC,
    getDatosActualesFC,
    getHistoricoFC,
    getEstacionesCesens,
    getEstacionCesens,
    getDatosActualesCesens,
    getHistoricoCesens,
    getMetricasEstacion,
    getStationMeta,
    saveStationMeta,
    getActiveSensors,
} from '../controllers/stations.controller.js';
import { autorizarRol } from '../middlewares/auth.middleware.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

// ── Sensores activos (KPI dashboard) ──────────────────────────────────────
router.get('/active-sensors', autenticarToken, getActiveSensors);

// ── FieldClimate (rutas estáticas primero para evitar conflicto con /:id) ──

/**
 * @swagger
 * /api/stations/fieldclimate:
 *   get:
 *     summary: Listar estaciones FieldClimate
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array de estaciones FieldClimate
 */
router.get('/fieldclimate', autenticarToken, getEstacionesFC);

/**
 * @swagger
 * /api/stations/fieldclimate/{id}:
 *   get:
 *     summary: Detalle de una estación FieldClimate
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos de la estación
 *       404:
 *         description: Estación no encontrada
 */
router.get('/fieldclimate/:id', autenticarToken, getEstacionFC);

/**
 * @swagger
 * /api/stations/fieldclimate/{id}/data:
 *   get:
 *     summary: Datos actuales de una estación FieldClimate
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Última lectura de todos los sensores
 */
router.get('/fieldclimate/:id/data', autenticarToken, getDatosActualesFC);

/**
 * @swagger
 * /api/stations/fieldclimate/{id}/history:
 *   get:
 *     summary: Histórico de una estación FieldClimate
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
router.get('/fieldclimate/:id/history', autenticarToken, getHistoricoFC);

// ── Cesens ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/stations/cesens:
 *   get:
 *     summary: Listar estaciones Cesens
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array de estaciones Cesens
 */
router.get('/cesens', autenticarToken, getEstacionesCesens);

/**
 * @swagger
 * /api/stations/cesens/{id}:
 *   get:
 *     summary: Detalle de una estación Cesens
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos de la estación
 *       404:
 *         description: Estación no encontrada
 */
router.get('/cesens/:id', autenticarToken, getEstacionCesens);

/**
 * @swagger
 * /api/stations/cesens/{id}/data:
 *   get:
 *     summary: Datos actuales de una estación Cesens
 *     tags: [Estaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Última lectura de todas las métricas
 */
router.get('/cesens/:id/data', autenticarToken, getDatosActualesCesens);

/**
 * @swagger
 * /api/stations/cesens/{id}/history:
 *   get:
 *     summary: Histórico de una estación Cesens
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
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: metric
 *         schema:
 *           type: integer
 *         description: ID de métrica específica (opcional)
 *     responses:
 *       200:
 *         description: Datos históricos del rango solicitado
 */
router.get('/cesens/:id/history', autenticarToken, getHistoricoCesens);

// ── Métricas disponibles (:source/:id/metrics) ─────────────────────────────
// Debe estar ANTES de /:id para evitar que "fieldclimate" sea capturado como :id

router.get('/:source/:id/metrics', autenticarToken, getMetricasEstacion);
router.get('/:source/:id/meta', autenticarToken, getStationMeta);
router.patch('/:source/:id/meta', autenticarToken, autorizarRol(['superadmin', 'tecnico']), saveStationMeta);

// ── Combinados / backwards compat ──────────────────────────────────────────

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
 *     summary: Detalle de una estación (requiere ?source=fieldclimate|cesens)
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
 *     summary: Datos actuales (requiere ?source=fieldclimate|cesens)
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
 *     summary: Histórico de datos (requiere ?source=fieldclimate|cesens)
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
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Datos históricos del rango solicitado
 */
router.get('/:id/history', autenticarToken, getHistorico);

export { router as stationsRoutes };
