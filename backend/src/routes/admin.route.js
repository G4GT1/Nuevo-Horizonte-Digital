import { Router } from 'express';
import {
    getUsuarios, getUsuario, crearUsuario, actualizarUsuario, eliminarUsuario,
    cambiarRol, suspenderUsuario, reactivarUsuario, enviarInvitacion, getInvitaciones,
    eliminarInvitacion, runAlertsNow, demoAlertaEmail, demoCuentaSuspendidaEmail
} from '../controllers/admin.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';
import {
    validarId, validarCrearUsuario, validarActualizarUsuario,
    validarCambiarRol, validarEnviarInvitacion
} from '../validators/admin.validator.js';

const router = Router();

// Autenticación obligatoria en todas las rutas
router.use(autenticarToken);

// ── Gestión de usuarios (superadmin + tecnico, con restricciones en controller) ──

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Listar usuarios con paginación y filtros
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [superadmin, tecnico, alumnado]
 *       - in: query
 *         name: suspended
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca en nombre, apellidos y email
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
 *         description: Lista de usuarios paginada
 *       403:
 *         description: Acceso denegado
 */
router.get('/users', autorizarRol(['superadmin', 'tecnico']), getUsuarios);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Administración]
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
 *         description: Datos del usuario
 *       404:
 *         description: Usuario no encontrado
 *   put:
 *     summary: Actualizar datos de un usuario
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellidos:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *   delete:
 *     summary: Eliminar usuario
 *     tags: [Administración]
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
 *         description: Usuario eliminado
 */
router.get('/users/:id', autorizarRol(['superadmin', 'tecnico']), validarId, getUsuario);
router.post('/users', autorizarRol(['superadmin']), validarCrearUsuario, crearUsuario);
router.put('/users/:id', autorizarRol(['superadmin', 'tecnico']), validarId, validarActualizarUsuario, actualizarUsuario);
router.delete('/users/:id', autorizarRol(['superadmin', 'tecnico']), validarId, eliminarUsuario);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Cambiar rol de un usuario
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [superadmin, tecnico, alumnado]
 *     responses:
 *       200:
 *         description: Rol actualizado
 *       400:
 *         description: No puedes cambiar tu propio rol
 */
router.put('/users/:id/role', autorizarRol(['superadmin', 'tecnico']), validarId, validarCambiarRol, cambiarRol);

/**
 * @swagger
 * /api/admin/users/{id}/suspend:
 *   put:
 *     summary: Suspender cuenta de usuario
 *     tags: [Administración]
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
 *         description: Usuario suspendido. Se envía email de notificación.
 *       400:
 *         description: No puedes suspender tu propia cuenta o ya está suspendido
 */
router.put('/users/:id/suspend', autorizarRol(['superadmin', 'tecnico']), validarId, suspenderUsuario);

/**
 * @swagger
 * /api/admin/users/{id}/reactivate:
 *   put:
 *     summary: Reactivar cuenta de usuario
 *     tags: [Administración]
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
 *         description: Usuario reactivado
 *       400:
 *         description: El usuario no está suspendido
 */
router.put('/users/:id/reactivate', autorizarRol(['superadmin', 'tecnico']), validarId, reactivarUsuario);

/**
 * @swagger
 * /api/admin/invitations:
 *   get:
 *     summary: Listar invitaciones enviadas
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de invitaciones con estado
 *   post:
 *     summary: Enviar invitación por magic link
 *     tags: [Administración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnviarInvitacionBody'
 *     responses:
 *       201:
 *         description: Invitación enviada por email (válida 72h)
 *       400:
 *         description: Ya existe usuario o invitación pendiente con ese email
 */
router.get('/invitations', autorizarRol(['superadmin']), getInvitaciones);
router.post('/invitations', autorizarRol(['superadmin']), validarEnviarInvitacion, enviarInvitacion);
router.delete('/invitations/:id', autorizarRol(['superadmin']), validarId, eliminarInvitacion);

router.post('/alerts/run-now', autorizarRol(['superadmin']), runAlertsNow);
router.post('/demo/alert-email', autorizarRol(['superadmin']), demoAlertaEmail);
router.post('/demo/suspend-email', autorizarRol(['superadmin']), demoCuentaSuspendidaEmail);

export { router as adminRoutes };
