import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model.js';
import { Invitation } from '../models/invitation.model.js';
import { enviarEmailInvitacion, enviarEmailCuentaSuspendida, enviarEmailAlertaCritica } from '../services/email.service.js';
import { registrarActividad } from '../utils/actividad.js';
import { crearNotificacion } from '../utils/notificaciones.js';
import { respuestaExito, respuestaCreado, respuestaError, respuestaNoEncontrado } from '../utils/respuestas.js';
import { comprobarAlertas } from '../jobs/alertas.job.js';

const SALT_ROUNDS = 12;

/**
 * GET /api/admin/users
 * Lista usuarios con filtros opcionales y paginacion. Tecnico solo puede ver alumnado.
 * @param {import('express').Request} req - query: { role, suspended, search, page, limit }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { usuarios, total, page, totalPages }
 */
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

/**
 * GET /api/admin/users/:id
 * Obtiene un usuario por su ID de MongoDB.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { usuario }; 404 si no existe
 */
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

/**
 * POST /api/admin/users
 * Crea un usuario directamente (sin verificacion de email). Solo superadmin.
 * @param {import('express').Request} req - body: { nombre, apellidos, email, password, role }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 201 con { id }; 400 si email duplicado
 */
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

/**
 * PUT /api/admin/users/:id
 * Actualiza nombre, apellidos y email de un usuario. Tecnico solo puede editar alumnado.
 * @param {import('express').Request} req - params: { id }, body: { nombre, apellidos, email }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { usuario }; 403 si tecnico intenta editar no-alumnado
 */
export const actualizarUsuario = async (req, res) => {
    try {
        const { nombre, apellidos, email } = req.body;

        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');
        if (req.user.role === 'tecnico' && usuario.role !== 'alumnado') {
            return respuestaError(res, 'Solo puedes gestionar usuarios con rol alumnado.', 403);
        }

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

/**
 * DELETE /api/admin/users/:id
 * Elimina un usuario. No permite auto-eliminacion. Tecnico solo puede eliminar alumnado.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si eliminado; 400 si intenta eliminar su propia cuenta; 403 si rol insuficiente
 */
export const eliminarUsuario = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return respuestaError(res, 'No puedes eliminar tu propia cuenta', 400);
        }

        const objetivo = await User.findById(req.params.id);
        if (!objetivo) return respuestaNoEncontrado(res, 'Usuario no encontrado');
        if (req.user.role === 'tecnico' && objetivo.role !== 'alumnado') {
            return respuestaError(res, 'Solo puedes gestionar usuarios con rol alumnado.', 403);
        }

        const usuario = await User.findByIdAndDelete(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');

        await registrarActividad(req.user._id, 'usuario_eliminado', req, { email: usuario.email, role: usuario.role });

        return respuestaExito(res, { message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al eliminar el usuario', 500, error.message);
    }
};

/**
 * PUT /api/admin/users/:id/role
 * Cambia el rol de un usuario. No permite cambio de rol propio. Notifica al usuario.
 * @param {import('express').Request} req - params: { id }, body: { role }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con mensaje; 400 si intenta cambiar su propio rol
 */
export const cambiarRol = async (req, res) => {
    try {
        const { role } = req.body;

        if (req.params.id === req.user._id.toString()) {
            return respuestaError(res, 'No puedes cambiar tu propio rol', 400);
        }

        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');
        if (req.user.role === 'tecnico' && usuario.role !== 'alumnado') {
            return respuestaError(res, 'Solo puedes gestionar usuarios con rol alumnado.', 403);
        }

        const rolAnterior = usuario.role;
        await User.findByIdAndUpdate(req.params.id, { role });

        await registrarActividad(req.user._id, 'rol_cambiado', req, { usuarioId: req.params.id, rolAnterior, rolNuevo: role });
        await crearNotificacion(usuario._id, 'cuenta_reactivada', 'Tu rol ha cambiado', `Tu rol ha sido actualizado a ${role}.`);

        return respuestaExito(res, { message: `Rol actualizado a ${role}.` });
    } catch (error) {
        return respuestaError(res, 'Error al cambiar el rol', 500, error.message);
    }
};

/**
 * PUT /api/admin/users/:id/suspend
 * Suspende una cuenta. Envia email de notificacion y crea notificacion in-app.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si suspendido; 400 si ya estaba suspendido o es auto-suspension
 */
export const suspenderUsuario = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return respuestaError(res, 'No puedes suspender tu propia cuenta', 400);
        }

        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');
        if (req.user.role === 'tecnico' && usuario.role !== 'alumnado') {
            return respuestaError(res, 'Solo puedes gestionar usuarios con rol alumnado.', 403);
        }
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

/**
 * PUT /api/admin/users/:id/reactivate
 * Reactiva una cuenta suspendida. Crea notificacion in-app al usuario.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si reactivado; 400 si el usuario no estaba suspendido
 */
export const reactivarUsuario = async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id);
        if (!usuario) return respuestaNoEncontrado(res, 'Usuario no encontrado');
        if (req.user.role === 'tecnico' && usuario.role !== 'alumnado') {
            return respuestaError(res, 'Solo puedes gestionar usuarios con rol alumnado.', 403);
        }
        if (!usuario.suspended) return respuestaError(res, 'El usuario no está suspendido', 400);

        await User.findByIdAndUpdate(req.params.id, { suspended: false });

        await crearNotificacion(usuario._id, 'cuenta_reactivada', 'Cuenta reactivada', 'Tu acceso a la plataforma ha sido restaurado.');
        await registrarActividad(req.user._id, 'usuario_reactivado', req, { usuarioId: req.params.id });

        return respuestaExito(res, { message: 'Usuario reactivado correctamente.' });
    } catch (error) {
        return respuestaError(res, 'Error al reactivar el usuario', 500, error.message);
    }
};

/**
 * POST /api/admin/invitations
 * Genera un magic link de invitacion (TTL: 72h) y envia el email al destinatario.
 * Si el email falla, la invitacion se crea igualmente y el enlace queda en la lista.
 * @param {import('express').Request} req - body: { email, role }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 201 con mensaje; 400 si ya existe usuario o invitacion pendiente
 */
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

        let emailEnviado = true;
        try {
            await enviarEmailInvitacion(email, `${admin.nombre} ${admin.apellidos}`, role, inviteToken, 'es');
        } catch (emailErr) {
            emailEnviado = false;
            console.error('[invite] Error enviando email:', emailErr.message);
        }

        await registrarActividad(req.user._id, 'invitacion_enviada', req, { email, role });

        return respuestaCreado(res, {
            message: emailEnviado
                ? `Invitación enviada a ${email}.`
                : `Invitación creada para ${email}. El email no se pudo enviar — el enlace está disponible en la lista de invitaciones.`
        });
    } catch (error) {
        return respuestaError(res, 'Error al enviar la invitación', 500, error.message);
    }
};

/**
 * DELETE /api/admin/invitations/:id
 * Elimina una invitacion pendiente. No permite eliminar invitaciones ya usadas.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 si eliminada; 400 si ya fue usada; 404 si no existe
 */
export const eliminarInvitacion = async (req, res) => {
    try {
        const invitacion = await Invitation.findById(req.params.id);
        if (!invitacion) return respuestaNoEncontrado(res, 'Invitación no encontrada');
        if (invitacion.usedAt) return respuestaError(res, 'No se puede eliminar una invitación ya usada', 400);

        await Invitation.findByIdAndDelete(req.params.id);
        await registrarActividad(req.user._id, 'invitacion_eliminada', req, { email: invitacion.email });

        return respuestaExito(res, { message: 'Invitación eliminada.' });
    } catch (error) {
        return respuestaError(res, 'Error al eliminar la invitación', 500, error.message);
    }
};

/**
 * GET /api/admin/invitations
 * Lista todas las invitaciones ordenadas por fecha de creacion descendente.
 * Incluye populate de createdBy (nombre, apellidos, email).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { invitaciones }
 */
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

/**
 * POST /api/admin/alerts/run-now
 * Ejecuta el job de comprobacion de alertas de forma sincrona. Solo superadmin.
 * @param {import('express').Request} req - req.user.email para log
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con resultado del job
 */
export const runAlertsNow = async (req, res) => {
    try {
        console.log(`[Admin] ${req.user.email} ejecutó el job de alertas manualmente`);
        const resultado = await comprobarAlertas();
        return respuestaExito(res, resultado);
    } catch (error) {
        return respuestaError(res, 'Error ejecutando el job de alertas', 500, error.message);
    }
};

/**
 * POST /api/admin/demo/alert-email
 * Envia un email de alerta critica de prueba al propio superadmin autenticado.
 * @param {import('express').Request} req - req.user._id del token
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con mensaje confirmando el envio
 */
export const demoAlertaEmail = async (req, res) => {
    try {
        const admin = await User.findById(req.user._id).select('email nombre apellidos preferences');
        const nombreCompleto = [admin.nombre, admin.apellidos].filter(Boolean).join(' ');
        await enviarEmailAlertaCritica(admin.email, nombreCompleto, {
            stationName: 'Estación Demo',
            metric:      'temperature',
            value:       42.5,
            threshold:   35,
            message:     'La temperatura supera el umbral configurado (42.5 °C vs 35 °C) en la estación Estación Demo.',
        }, admin.preferences?.language ?? 'es');
        return respuestaExito(res, { message: `Email de alerta demo enviado a ${admin.email}` });
    } catch (error) {
        return respuestaError(res, 'Error enviando email demo de alerta', 500, error.message);
    }
};

/**
 * POST /api/admin/demo/suspend-email
 * Envia un email de cuenta suspendida de prueba al propio superadmin autenticado.
 * @param {import('express').Request} req - req.user._id del token
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con mensaje confirmando el envio
 */
export const demoCuentaSuspendidaEmail = async (req, res) => {
    try {
        const admin = await User.findById(req.user._id).select('email nombre apellidos preferences');
        const nombreCompleto = [admin.nombre, admin.apellidos].filter(Boolean).join(' ');
        await enviarEmailCuentaSuspendida(admin.email, nombreCompleto, admin.preferences?.language ?? 'es');
        return respuestaExito(res, { message: `Email de suspensión demo enviado a ${admin.email}` });
    } catch (error) {
        return respuestaError(res, 'Error enviando email demo de suspensión', 500, error.message);
    }
};
