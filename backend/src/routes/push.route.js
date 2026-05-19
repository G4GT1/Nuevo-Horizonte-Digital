import { Router } from 'express';
import { suscribir, desuscribir } from '../controllers/push.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';
import { validarSuscripcion } from '../validators/push.validator.js';

const router = Router();

router.post('/subscribe', autenticarToken, validarSuscripcion, suscribir);
router.delete('/unsubscribe', autenticarToken, desuscribir);

export { router as pushRoutes };
