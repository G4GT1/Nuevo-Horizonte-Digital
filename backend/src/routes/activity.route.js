import { Router } from 'express';
import { getMiActividad, getActividadGlobal } from '../controllers/activity.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(autenticarToken);

// Todos los roles pueden ver su propia actividad
router.get('/me', getMiActividad);

// Solo superadmin puede ver el log global
router.get('/', autorizarRol(['superadmin']), getActividadGlobal);

export { router as activityRoutes };
