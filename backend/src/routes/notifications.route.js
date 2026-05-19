import { Router } from 'express';
import { getNotificaciones, marcarLeida, marcarTodasLeidas, eliminarNotificacion } from '../controllers/notifications.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(autenticarToken);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Obtener notificaciones del usuario autenticado
 *     description: Devuelve notificaciones paginadas más el contador de no leídas.
 *     tags: [Notificaciones]
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de notificaciones y contador de no leídas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notificaciones:
 *                   type: array
 *                 noLeidas:
 *                   type: integer
 *                 total:
 *                   type: integer
 */
router.get('/', getNotificaciones);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Marcar todas las notificaciones como leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las notificaciones marcadas como leídas
 */
router.put('/read-all', marcarTodasLeidas);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Marcar una notificación como leída
 *     tags: [Notificaciones]
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
 *         description: Notificación marcada como leída
 *       403:
 *         description: La notificación no pertenece al usuario
 */
router.put('/:id/read', marcarLeida);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Eliminar una notificación
 *     tags: [Notificaciones]
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
 *         description: Notificación eliminada
 */
router.delete('/:id', eliminarNotificacion);

export { router as notificationsRoutes };
