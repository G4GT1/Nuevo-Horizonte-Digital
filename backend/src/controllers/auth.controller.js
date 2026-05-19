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

const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

export const register = async (req, res) => {
    try {
        const { nombre, apellidos, email, password } = req.body;

        const existe = await User.findOne({ email });
        if (existe) return respuestaError(res, 'El email ya está registrado', 400);

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

        await enviarEmailVerificacion(email, nombre, emailVerifyToken);
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
        if (error.code === 11000) return respuestaError(res, 'El email ya está registrado', 400);
        if (error.name === 'ValidationError') return respuestaError(res, 'Error de validación', 400);
        return respuestaError(res, 'Error al registrar el usuario', 500, error.message);
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const usuario = await User.findOne({ email });
        if (!usuario) return respuestaNoAutorizado(res, 'Credenciales incorrectas');

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) return respuestaNoAutorizado(res, 'Credenciales incorrectas');

        if (!usuario.emailVerified) return respuestaError(res, 'Debes verificar tu email antes de iniciar sesión', 403);
        if (usuario.suspended) return respuestaError(res, 'Tu cuenta ha sido suspendida. Contacta con el administrador.', 403);

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

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const usuario = await User.findOne({ email });

        // Respuesta genérica para no revelar si el email existe
        if (!usuario) return respuestaExito(res, { message: 'Si el email existe, recibirás un enlace para restablecer la contraseña.' });

        const resetPasswordToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordTokenExpira = new Date(Date.now() + 60 * 60 * 1000);

        await User.findByIdAndUpdate(usuario._id, { resetPasswordToken, resetPasswordTokenExpira });
        await enviarEmailResetPassword(email, usuario.nombre, resetPasswordToken);
        await registrarActividad(usuario._id, 'password_reset_solicitado', req);

        return respuestaExito(res, { message: 'Si el email existe, recibirás un enlace para restablecer la contraseña.' });
    } catch (error) {
        return respuestaError(res, 'Error al procesar la solicitud', 500, error.message);
    }
};

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

export const logout = async (req, res) => {
    try {
        await registrarActividad(req.user._id, 'logout', req);
        res.clearCookie('refreshToken', COOKIE_OPTS);
        return respuestaExito(res, { message: 'Sesión cerrada correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al cerrar sesión', 500, error.message);
    }
};

// ── Flujo de invitación (magic link) ──────────────────────────────────────

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
