import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model.js';
import { Invitation } from '../models/invitation.model.js';
import { enviarEmailInvitacion, enviarEmailCuentaSuspendida } from '../services/email.service.js';
import { registrarActividad } from '../utils/actividad.js';
import { crearNotificacion } from '../utils/notificaciones.js';
import { respuestaExito, respuestaCreado, respuestaError, respuestaNoEncontrado } from '../utils/respuestas.js';

const SALT_ROUNDS = 12;

export const getUsuarios = async (req, res) => {
    try {
        const { role, suspended, search, page = 1, limit = 20 } = req.query;

        const filtro = {};
        if (role) filtro.role = role;
        if (suspended !== undefined) filtro.suspended = suspended === 'true';
        if (search) {
            filtro.$or = [
                { nombre: { $regex: search, $options: 'i' } },
                { apellidos: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [usuarios, total] = await Promise.all([
            User.find(filtro)
                .select('-password -emailVerifyToken -emailVerifyTokenExpira -resetPasswordToken -resetPasswordTokenExpira')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            User.countDocuments(filtro)
        ]);

        return respuestaExito(res, { usuarios, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        return respuestaError(res, 'Error al obtener los usuarios', 500, error.message);
    }
};

export const getUsuario = async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id)
            .select('-password -emailVerifyToken -emailVerifyTokenExpira -resetPasswordToken -resetPasswordTokenExpira');

        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');

        return respuestaExito(res, { usuario });
    } catch (error) {
        return respuestaError(res, 'Error al obtener el usuario', 500, error.message);
    }
};

export const crearUsuario = async (req, res) => {
    try {
        const { nombre, apellidos, email, password, role } = req.body;

        const existe = await User.findOne({ email });
        if (existe) return respuestaError(res, 'El email ya está registrado', 400);

        const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const usuario = await User.create({
            nombre, apellidos, email,
            password: hashPassword,
            role: role ?? 'tecnico',
            emailVerified: true
        });

        await registrarActividad(req.user._id, 'usuario_creado', req, { usuarioId: usuario._id, email, role });

        return respuestaCreado(res, { id: usuario._id });
    } catch (error) {
        if (error.code === 11000) return respuestaError(res, 'El email ya está registrado', 400);
        return respuestaError(res, 'Error al crear el usuario', 500, error.message);
    }
};

export const actualizarUsuario = async (req, res) => {
    try {
        const { nombre, apellidos, email } = req.body;

        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');

        const actualizado = await User.findByIdAndUpdate(
            req.params.id,
            { nombre, apellidos, email },
            { new: true, runValidators: true }
        ).select('-password -emailVerifyToken -emailVerifyTokenExpira -resetPasswordToken -resetPasswordTokenExpira');

        await registrarActividad(req.user._id, 'usuario_actualizado', req, { usuarioId: req.params.id });

        return respuestaExito(res, { usuario: actualizado });
    } catch (error) {
        if (error.code === 11000) return respuestaError(res, 'El email ya está registrado', 400);
        return respuestaError(res, 'Error al actualizar el usuario', 500, error.message);
    }
};

export const eliminarUsuario = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return respuestaError(res, 'No puedes eliminar tu propia cuenta', 400);
        }

        const usuario = await User.findByIdAndDelete(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');

        await registrarActividad(req.user._id, 'usuario_eliminado', req, { email: usuario.email, role: usuario.role });

        return respuestaExito(res, { message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al eliminar el usuario', 500, error.message);
    }
};

export const cambiarRol = async (req, res) => {
    try {
        const { role } = req.body;

        if (req.params.id === req.user._id.toString()) {
            return respuestaError(res, 'No puedes cambiar tu propio rol', 400);
        }

        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');

        const rolAnterior = usuario.role;
        await User.findByIdAndUpdate(req.params.id, { role });

        await registrarActividad(req.user._id, 'rol_cambiado', req, { usuarioId: req.params.id, rolAnterior, rolNuevo: role });
        await crearNotificacion(usuario._id, 'cuenta_reactivada', 'Tu rol ha cambiado', `Tu rol ha sido actualizado a ${role}.`);

        return respuestaExito(res, { message: `Rol actualizado a ${role}.` });
    } catch (error) {
        return respuestaError(res, 'Error al cambiar el rol', 500, error.message);
    }
};

export const suspenderUsuario = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return respuestaError(res, 'No puedes suspender tu propia cuenta', 400);
        }

        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');
        if (usuario.suspended) return respuestaError(res, 'El usuario ya está suspendido', 400);

        await User.findByIdAndUpdate(req.params.id, { suspended: true });

        await enviarEmailCuentaSuspendida(usuario.email, usuario.nombre, usuario.preferences?.language);
        await crearNotificacion(usuario._id, 'cuenta_suspendida', 'Cuenta suspendida', 'Tu acceso a la plataforma ha sido suspendido por un administrador.');
        await registrarActividad(req.user._id, 'usuario_suspendido', req, { usuarioId: req.params.id });

        return respuestaExito(res, { message: 'Usuario suspendido correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al suspender el usuario', 500, error.message);
    }
};

export const reactivarUsuario = async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');
        if (!usuario.suspended) return respuestaError(res, 'El usuario no está suspendido', 400);

        await User.findByIdAndUpdate(req.params.id, { suspended: false });

        await crearNotificacion(usuario._id, 'cuenta_reactivada', 'Cuenta reactivada', 'Tu acceso a la plataforma ha sido restaurado.');
        await registrarActividad(req.user._id, 'usuario_reactivado', req, { usuarioId: req.params.id });

        return respuestaExito(res, { message: 'Usuario reactivado correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al reactivar el usuario', 500, error.message);
    }
};

export const enviarInvitacion = async (req, res) => {
    try {
        const { email, role } = req.body;

        const usuarioExiste = await User.findOne({ email });
        if (usuarioExiste) return respuestaError(res, 'Ya existe un usuario con ese email', 400);

        const invitacionExiste = await Invitation.findOne({ email, usedAt: null, expiresAt: { $gt: new Date() } });
        if (invitacionExiste) return respuestaError(res, 'Ya hay una invitación pendiente para ese email', 400);

        const inviteToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        await Invitation.create({ email, role, inviteToken, expiresAt, createdBy: req.user._id });

        const admin = await User.findById(req.user._id).select('nombre apellidos');
        await enviarEmailInvitacion(email, `${admin.nombre} ${admin.apellidos}`, role, inviteToken, 'es');
        await registrarActividad(req.user._id, 'invitacion_enviada', req, { email, role });

        return respuestaCreado(res, { message: `Invitación enviada a ${email}.` });
    } catch (error) {
        return respuestaError(res, 'Error al enviar la invitación', 500, error.message);
    }
};

export const getInvitaciones = async (req, res) => {
    try {
        const invitaciones = await Invitation.find()
            .populate('createdBy', 'nombre apellidos email')
            .sort({ createdAt: -1 });

        return respuestaExito(res, { invitaciones });
    } catch (error) {
        return respuestaError(res, 'Error al obtener las invitaciones', 500, error.message);
    }
};
