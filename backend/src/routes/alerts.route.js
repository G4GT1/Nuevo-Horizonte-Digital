import { Router } from 'express';
import {
    getAlertas, getConfigAlertas, crearConfigAlerta,
    actualizarConfigAlerta, eliminarConfigAlerta, resolverAlerta
} from '../controllers/alerts.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';
import { validarId, validarConfigAlerta } from '../validators/alerts.validator.js';

const router = Router();

router.use(autenticarToken);

// Solo superadmin y tecnico pueden gestionar alertas
router.get('/', autorizarRol(['superadmin', 'tecnico']), getAlertas);
router.get('/config', autorizarRol(['superadmin', 'tecnico']), getConfigAlertas);
router.post('/config', autorizarRol(['superadmin', 'tecnico']), validarConfigAlerta, crearConfigAlerta);
router.put('/config/:id', autorizarRol(['superadmin', 'tecnico']), validarId, validarConfigAlerta, actualizarConfigAlerta);
router.delete('/config/:id', autorizarRol(['superadmin', 'tecnico']), validarId, eliminarConfigAlerta);
router.put('/:id/resolve', autorizarRol(['superadmin', 'tecnico']), validarId, resolverAlerta);

export { router as alertsRoutes };
