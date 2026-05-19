import { Router } from 'express';
import { suscribir, desuscribir } from '../controllers/push.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';
import { validarSuscripcion } from '../validators/push.validator.js';

const router = Router();

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Suscribirse a notificaciones push del navegador
 *     description: Solo disponible para superadmin y técnico. Almacena la suscripción VAPID.
 *     tags: [Push]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SuscripcionBody'
 *     responses:
 *       201:
 *         description: Suscripción registrada
 *       403:
 *         description: Alumnado no puede suscribirse a push
 */
router.post('/subscribe', autenticarToken, validarSuscripcion, suscribir);

/**
 * @swagger
 * /api/push/unsubscribe:
 *   delete:
 *     summary: Cancelar suscripción push
 *     tags: [Push]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suscripción eliminada
 */
router.delete('/unsubscribe', autenticarToken, desuscribir);

export { router as pushRoutes };
