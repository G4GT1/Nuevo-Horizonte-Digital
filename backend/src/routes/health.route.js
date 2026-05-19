import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Estado del sistema
 *     description: Comprueba la conectividad real con MongoDB, FieldClimate, Cesens y Groq. Endpoint público, sin autenticación.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Sistema operativo (ok o degraded)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Base de datos no disponible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', getHealth);

export { router as healthRoutes };
