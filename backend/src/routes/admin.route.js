import { Router } from 'express';
import {
    getUsuarios, getUsuario, crearUsuario, actualizarUsuario, eliminarUsuario,
    cambiarRol, suspenderUsuario, reactivarUsuario, enviarInvitacion, getInvitaciones
} from '../controllers/admin.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';
import {
    validarId, validarCrearUsuario, validarActualizarUsuario,
    validarCambiarRol, validarEnviarInvitacion
} from '../validators/admin.validator.js';

const router = Router();

// Todas las rutas de admin requieren superadmin
router.use(autenticarToken, autorizarRol(['superadmin']));

router.get('/users', getUsuarios);
router.get('/users/:id', validarId, getUsuario);
router.post('/users', validarCrearUsuario, crearUsuario);
router.put('/users/:id', validarId, validarActualizarUsuario, actualizarUsuario);
router.delete('/users/:id', validarId, eliminarUsuario);
router.put('/users/:id/role', validarId, validarCambiarRol, cambiarRol);
router.put('/users/:id/suspend', validarId, suspenderUsuario);
router.put('/users/:id/reactivate', validarId, reactivarUsuario);

router.get('/invitations', getInvitaciones);
router.post('/invitations', validarEnviarInvitacion, enviarInvitacion);

export { router as adminRoutes };
