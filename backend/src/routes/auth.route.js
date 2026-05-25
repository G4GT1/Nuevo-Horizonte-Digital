import { Router } from 'express';
import {
    register, login, verificarEmail, forgotPassword, resetPassword,
    refreshToken, logout, validarInvitacion, aceptarInvitacion,
    reenviarVerificacion, actualizarPerfil, cambiarPassword
} from '../controllers/auth.controller.js';
import {
    validarRegistro, validarLogin, validarForgotPassword,
    validarResetPassword, validarToken, validarAceptarInvitacion
} from '../validators/auth.validator.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario (rol alumnado)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroBody'
 *     responses:
 *       201:
 *         description: Registro exitoso. Se envía email de verificación.
 *       400:
 *         description: Email ya registrado o datos inválidos
 */
router.post('/register', validarRegistro, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login exitoso. Devuelve accessToken. El refreshToken se guarda en cookie httpOnly.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciales incorrectas
 *       403:
 *         description: Email no verificado o cuenta suspendida
 */
router.post('/login', validarLogin, login);

/**
 * @swagger
 * /api/auth/verify/{token}:
 *   get:
 *     summary: Verificar email con token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verificado correctamente
 *       400:
 *         description: Token inválido o expirado
 */
router.get('/verify/:token', validarToken, verificarEmail);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     description: Siempre responde 200 para evitar enumeración de usuarios.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Respuesta genérica (anti-enumeración)
 */
router.post('/forgot-password', validarForgotPassword, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Contraseña restablecida
 *       400:
 *         description: Token inválido o expirado
 */
router.post('/reset-password', validarResetPassword, resetPassword);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Renovar access token
 *     description: Lee el refreshToken de la cookie httpOnly y devuelve un nuevo accessToken.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Nuevo accessToken generado
 *       401:
 *         description: Sin refresh token
 *       403:
 *         description: Token inválido, expirado o cuenta suspendida
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /api/auth/invite/{token}:
 *   get:
 *     summary: Validar token de invitación
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token válido. Devuelve email y rol asignado.
 *       400:
 *         description: Invitación inválida o expirada
 */
router.get('/invite/:token', validarToken, validarInvitacion);

/**
 * @swagger
 * /api/auth/invite/accept:
 *   post:
 *     summary: Aceptar invitación y crear cuenta
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvitacionAcceptBody'
 *     responses:
 *       201:
 *         description: Cuenta creada. Devuelve accessToken.
 *       400:
 *         description: Invitación inválida, expirada o email ya registrado
 */
router.post('/invite/accept', validarAceptarInvitacion, aceptarInvitacion);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada. Cookie de refresh eliminada.
 *       401:
 *         description: No autenticado
 */
router.post('/logout', autenticarToken, logout);
router.post('/resend-verification', reenviarVerificacion);
router.put('/profile', autenticarToken, actualizarPerfil);
router.put('/change-password', autenticarToken, cambiarPassword);

export { router as authRoutes };
