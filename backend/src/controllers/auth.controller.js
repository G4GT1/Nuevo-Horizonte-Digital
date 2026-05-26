import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model.js';
import { Invitation } from '../models/invitation.model.js';
import { generarAccessToken, generarRefreshToken, verificarRefreshToken } from '../middlewares/auth.middleware.js';
import { enviarEmailVerificacion, enviarEmailResetPassword } from '../services/email.service.js';
import { registrarActividad } from '../utils/actividad.js';
import { notificarSuperadmins } from '../utils/notificaciones.js';
import { respuestaExito, respuestaCreado, respuestaError, respuestaNoEncontrado, respuestaNoAutorizado } from '../utils/respuestas.js';

const SALT_ROUNDS = 12;

/* refreshToken cookie: httpOnly, 7-day expiry.
   En producción (Vercel + Render son dominios distintos) se necesita
   SameSite=None + Secure para que el navegador envíe la cookie cross-origin.
   En desarrollo SameSite=Lax es suficiente y no requiere HTTPS. */
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

/**
 * POST /api/auth/register
 * Registra un nuevo usuario con rol 'alumnado'. Envia email de verificacion.
 * @param {import('express').Request} req - body: { nombre, apellidos, email, password }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 201 con id del usuario creado
 */
export const register = async (req, res) => {
    try {
        const { nombre, apellidos, email, password } = req.body;

        const existe = await User.findOne({ email });
        if (existe) return res.status(400).json({ message: 'Ya existe una cuenta con ese email.', errorCode: 'EMAIL_EXISTS' });

        const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const emailVerifyToken = crypto.randomBytes(32).toString('hex');
        const emailVerifyTokenExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const usuario = await User.create({
            nombre, apellidos, email,
            password: hashPassword,
            role: 'alumnado',
            emailVerified: false,
            emailVerifyToken,
            emailVerifyTokenExpira
        });

        await enviarEmailVerificacion(email, nombre, emailVerifyToken, usuario.preferences?.language);
        await notificarSuperadmins(
            'nuevo_usuario',
            'Nuevo usuario registrado',
            `${nombre} ${apellidos} se ha registrado con el email ${email}.`,
            '/admin/usuarios'
        );

        return respuestaCreado(res, {
            message: 'Registro exitoso. Revisa tu email para verificar la cuenta.',
            id: usuario._id
        });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Ya existe una cuenta con ese email.', errorCode: 'EMAIL_EXISTS' });
        if (error.name === 'ValidationError') return respuestaError(res, 'Error de validación', 400);
        return respuestaError(res, 'Error al registrar el usuario', 500, error.message);
    }
};

/**
 * POST /api/auth/login
 * Autentica usuario. Establece cookie httpOnly con refreshToken y devuelve accessToken.
 * @param {import('express').Request} req - body: { email, password }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con accessToken y datos de usuario
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const usuario = await User.findOne({ email });
        if (!usuario) return res.status(401).json({ message: 'No encontramos una cuenta con ese email.', errorCode: 'EMAIL_NOT_FOUND' });

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) return res.status(401).json({ message: 'Contraseña incorrecta.', errorCode: 'WRONG_PASSWORD' });

        if (!usuario.emailVerified) return res.status(403).json({ message: 'Debes verificar tu email antes de iniciar sesión.', errorCode: 'EMAIL_NOT_VERIFIED', email: usuario.email });
        if (usuario.suspended) return res.status(403).json({ message: 'Tu cuenta ha sido suspendida.', errorCode: 'ACCOUNT_SUSPENDED' });

        const payload = { _id: usuario._id, role: usuario.role, email: usuario.email };
        const accessToken = generarAccessToken(payload);
        const refreshToken = generarRefreshToken(payload);

        await User.findByIdAndUpdate(usuario._id, { lastLogin: new Date() });
        await registrarActividad(usuario._id, 'login', req);

        res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

        return respuestaExito(res, {
            accessToken,
            user: {
                id: usuario._id,
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                email: usuario.email,
                role: usuario.role,
                preferences: usuario.preferences
            }
        });
    } catch (error) {
        return respuestaError(res, 'Error al iniciar sesión', 500, error.message);
    }
};

/**
 * GET /api/auth/verify/:token
 * Verifica el email del usuario usando el token de 32 bytes enviado por correo.
 * @param {import('express').Request} req - params: { token }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si token valido; 400 si expirado o no existe
 */
export const verificarEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const usuario = await User.findOne({
            emailVerifyToken: token,
            emailVerifyTokenExpira: { $gt: new Date() }
        });

        if (!usuario) return respuestaError(res, 'El enlace de verificación no es válido o ha expirado', 400);

        await User.findByIdAndUpdate(usuario._id, {
            emailVerified: true,
            emailVerifyToken: null,
            emailVerifyTokenExpira: null
        });

        await registrarActividad(usuario._id, 'email_verificado', req);

        return respuestaExito(res, { message: 'Email verificado correctamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        return respuestaError(res, 'Error al verificar el email', 500, error.message);
    }
};

/**
 * POST /api/auth/forgot-password
 * Solicita reset de contrasena. Siempre responde 200 para no revelar si el email existe.
 * @param {import('express').Request} req - body: { email }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 siempre
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const usuario = await User.findOne({ email });

        // Respuesta genérica para no revelar si el email existe
        if (!usuario) return respuestaExito(res, { message: 'Si el email existe, recibirás un enlace para restablecer la contraseña.' });

        const resetPasswordToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordTokenExpira = new Date(Date.now() + 60 * 60 * 1000);

        await User.findByIdAndUpdate(usuario._id, { resetPasswordToken, resetPasswordTokenExpira });
        await enviarEmailResetPassword(email, usuario.nombre, resetPasswordToken, usuario.preferences?.language);
        await registrarActividad(usuario._id, 'password_reset_solicitado', req);

        return respuestaExito(res, { message: 'Si el email existe, recibirás un enlace para restablecer la contraseña.' });
    } catch (error) {
        return respuestaError(res, 'Error al procesar la solicitud', 500, error.message);
    }
};

/**
 * POST /api/auth/reset-password
 * Restablece la contrasena usando el token enviado por email (TTL: 1 hora).
 * @param {import('express').Request} req - body: { token, password }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si exito; 400 si token invalido o expirado
 */
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const usuario = await User.findOne({
            resetPasswordToken: token,
            resetPasswordTokenExpira: { $gt: new Date() }
        });

        if (!usuario) return respuestaError(res, 'El enlace no es válido o ha expirado', 400);

        const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await User.findByIdAndUpdate(usuario._id, {
            password: hashPassword,
            resetPasswordToken: null,
            resetPasswordTokenExpira: null
        });

        await registrarActividad(usuario._id, 'password_reset', req);

        return respuestaExito(res, { message: 'Contraseña restablecida correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al restablecer la contraseña', 500, error.message);
    }
};

/**
 * POST /api/auth/refresh-token
 * Lee la cookie httpOnly 'refreshToken' y emite un nuevo accessToken (JWT 15 min).
 * @param {import('express').Request} req - cookie: refreshToken
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con nuevo accessToken; 403 si token invalido o cuenta suspendida
 */
export const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token) return respuestaNoAutorizado(res, 'Refresh token no proporcionado');

        const payload = verificarRefreshToken(token);
        const usuario = await User.findById(payload._id).select('_id role email suspended');

        if (!usuario) return respuestaNoAutorizado(res, 'Usuario no encontrado');
        if (usuario.suspended) return respuestaError(res, 'Cuenta suspendida', 403);

        const accessToken = generarAccessToken({ _id: usuario._id, role: usuario.role, email: usuario.email });

        return respuestaExito(res, { accessToken });
    } catch {
        return respuestaError(res, 'Refresh token inválido o expirado', 403);
    }
};

/**
 * POST /api/auth/logout
 * Registra actividad de logout y elimina la cookie de refreshToken.
 * @param {import('express').Request} req - autenticado con autenticarToken
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 siempre
 */
export const logout = async (req, res) => {
    try {
        await registrarActividad(req.user._id, 'logout', req);
        res.clearCookie('refreshToken', COOKIE_OPTS);
        return respuestaExito(res, { message: 'Sesión cerrada correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al cerrar sesión', 500, error.message);
    }
};

/**
 * POST /api/auth/resend-verification
 * Genera nuevo token de verificacion y reenvía el email. Responde 200 siempre (anti-enumeracion).
 * @param {import('express').Request} req - body: { email }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 siempre
 */
export const reenviarVerificacion = async (req, res) => {
    try {
        const { email } = req.body;
        const usuario = await User.findOne({ email });
        if (!usuario || usuario.emailVerified) {
            return respuestaExito(res, { message: 'Si el email existe y no está verificado, recibirás un nuevo email.' });
        }
        const emailVerifyToken = crypto.randomBytes(32).toString('hex');
        const emailVerifyTokenExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await User.findByIdAndUpdate(usuario._id, { emailVerifyToken, emailVerifyTokenExpira });
        await enviarEmailVerificacion(email, usuario.nombre, emailVerifyToken, usuario.preferences?.language);
        return respuestaExito(res, { message: 'Email de verificación reenviado.' });
    } catch (error) {
        return respuestaError(res, 'Error al reenviar la verificación', 500, error.message);
    }
};

/**
 * PUT /api/auth/profile
 * Actualiza nombre y apellidos del usuario autenticado.
 * @param {import('express').Request} req - body: { nombre, apellidos }; req.user._id del token
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con usuario actualizado
 */
export const actualizarPerfil = async (req, res) => {
    try {
        const { nombre, apellidos } = req.body;
        if (!nombre || !apellidos) return respuestaError(res, 'Nombre y apellidos son requeridos', 400);
        const usuario = await User.findByIdAndUpdate(
            req.user._id,
            { nombre: nombre.trim(), apellidos: apellidos.trim() },
            { new: true, runValidators: true }
        ).select('nombre apellidos email role preferences notifications lastLogin');
        return respuestaExito(res, { usuario });
    } catch (error) {
        return respuestaError(res, 'Error al actualizar el perfil', 500, error.message);
    }
};

/**
 * PUT /api/auth/change-password
 * Cambia la contrasena verificando la contrasena actual con bcrypt.
 * @param {import('express').Request} req - body: { currentPassword, newPassword }; req.user._id del token
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si exito; 400 si contrasena actual incorrecta
 */
export const cambiarPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return respuestaError(res, 'Se requiere la contraseña actual y la nueva', 400);

        const usuario = await User.findById(req.user._id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');

        const valida = await bcrypt.compare(currentPassword, usuario.password);
        if (!valida) return res.status(400).json({ message: 'La contraseña actual no es correcta.', errorCode: 'WRONG_CURRENT_PASSWORD' });

        const hashPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await User.findByIdAndUpdate(req.user._id, { password: hashPassword });
        await registrarActividad(req.user._id, 'password_cambiado', req);

        return respuestaExito(res, { message: 'Contraseña cambiada correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al cambiar la contraseña', 500, error.message);
    }
};

// ── Flujo de invitacion (magic link) ──────────────────────────────────────

/**
 * GET /api/auth/invite/:token
 * Valida un token de invitacion y devuelve el email y rol asociados.
 * @param {import('express').Request} req - params: { token }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { email, role }; 400 si invalido o expirado
 */
export const validarInvitacion = async (req, res) => {
    try {
        const { token } = req.params;

        const invitacion = await Invitation.findOne({
            inviteToken: token,
            usedAt: null,
            expiresAt: { $gt: new Date() }
        });

        if (!invitacion) return respuestaError(res, 'La invitación no es válida o ha expirado', 400);

        return respuestaExito(res, { email: invitacion.email, role: invitacion.role });
    } catch (error) {
        return respuestaError(res, 'Error al validar la invitación', 500, error.message);
    }
};

/**
 * POST /api/auth/invite/accept
 * Crea la cuenta del usuario invitado, marca la invitacion como usada y devuelve tokens.
 * @param {import('express').Request} req - body: { token, nombre, apellidos, password }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 201 con accessToken y datos de usuario; 400 si invitacion invalida
 */
export const aceptarInvitacion = async (req, res) => {
    try {
        const { token, nombre, apellidos, password } = req.body;

        const invitacion = await Invitation.findOne({
            inviteToken: token,
            usedAt: null,
            expiresAt: { $gt: new Date() }
        });

        if (!invitacion) return respuestaError(res, 'La invitación no es válida o ha expirado', 400);

        const existe = await User.findOne({ email: invitacion.email });
        if (existe) return respuestaError(res, 'Ya existe una cuenta con este email', 400);

        const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const usuario = await User.create({
            nombre, apellidos,
            email: invitacion.email,
            password: hashPassword,
            role: invitacion.role,
            emailVerified: true
        });

        await Invitation.findByIdAndUpdate(invitacion._id, { usedAt: new Date() });
        await registrarActividad(usuario._id, 'invitacion_aceptada', req, { invitacion: invitacion._id });
        await notificarSuperadmins(
            'invitacion_aceptada',
            'Invitación aceptada',
            `${nombre} ${apellidos} ha aceptado su invitación como ${invitacion.role}.`,
            '/admin/usuarios'
        );

        const payload = { _id: usuario._id, role: usuario.role, email: usuario.email };
        const accessToken = generarAccessToken(payload);
        const refreshTokenVal = generarRefreshToken(payload);

        res.cookie('refreshToken', refreshTokenVal, COOKIE_OPTS);

        return respuestaCreado(res, {
            accessToken,
            user: {
                id: usuario._id,
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                email: usuario.email,
                role: usuario.role
            }
        });
    } catch (error) {
        if (error.code === 11000) return respuestaError(res, 'El email ya está registrado', 400);
        return respuestaError(res, 'Error al aceptar la invitación', 500, error.message);
    }
};
