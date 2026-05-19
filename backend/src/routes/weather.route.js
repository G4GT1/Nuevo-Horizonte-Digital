import { Router } from 'express';
import { getPrediccion } from '../controllers/weather.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/weather:
 *   get:
 *     summary: Predicción meteorológica de la ubicación de las estaciones
 *     description: Usa Open-Meteo (sin API key). Las coordenadas se configuran en STATION_LATITUDE y STATION_LONGITUDE del .env.
 *     tags: [Meteorología]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Predicción para las próximas horas/días
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prediccion:
 *                   type: object
 *                   description: Datos de Open-Meteo (temperatura, precipitación, viento, etc.)
 */
router.get('/', autenticarToken, getPrediccion);

export { router as weatherRoutes };
