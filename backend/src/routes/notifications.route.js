import { Router } from 'express';
import { getNotificaciones, marcarLeida, marcarTodasLeidas, eliminarNotificacion } from '../controllers/notifications.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(autenticarToken);

router.get('/', getNotificaciones);
router.put('/read-all', marcarTodasLeidas);
router.put('/:id/read', marcarLeida);
router.delete('/:id', eliminarNotificacion);

export { router as notificationsRoutes };
