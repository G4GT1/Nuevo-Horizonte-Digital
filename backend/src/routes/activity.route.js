import { Router } from 'express';
import { getMiActividad, getActividadGlobal } from '../controllers/activity.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(autenticarToken);

/**
 * @swagger
 * /api/activity/me:
 *   get:
 *     summary: Ver mi historial de actividad
 *     description: Disponible para todos los roles. Devuelve las acciones propias del usuario autenticado.
 *     tags: [Actividad]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Historial de acciones del usuario
 */
router.get('/me', getMiActividad);

/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: Log global de actividad (solo superadmin)
 *     description: Muestra todas las acciones de todos los usuarios con datos del usuario poblados.
 *     tags: [Actividad]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Log global de actividad con usuarios poblados
 *       403:
 *         description: Acceso denegado
 */
router.get('/', autorizarRol(['superadmin']), getActividadGlobal);

export { router as activityRoutes };
