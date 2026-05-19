import { Router } from 'express';
import {
    register, login, verificarEmail, forgotPassword, resetPassword,
    refreshToken, logout, validarInvitacion, aceptarInvitacion
} from '../controllers/auth.controller.js';
import {
    validarRegistro, validarLogin, validarForgotPassword,
    validarResetPassword, validarToken, validarAceptarInvitacion
} from '../validators/auth.validator.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas públicas
router.post('/register', validarRegistro, register);
router.post('/login', validarLogin, login);
router.get('/verify/:token', validarToken, verificarEmail);
router.post('/forgot-password', validarForgotPassword, forgotPassword);
router.post('/reset-password', validarResetPassword, resetPassword);
router.post('/refresh-token', refreshToken);

// Invitación magic link (públicas)
router.get('/invite/:token', validarToken, validarInvitacion);
router.post('/invite/accept', validarAceptarInvitacion, aceptarInvitacion);

// Requiere autenticación
router.post('/logout', autenticarToken, logout);

export { router as authRoutes };
