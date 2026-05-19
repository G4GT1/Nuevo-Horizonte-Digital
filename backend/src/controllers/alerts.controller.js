import { Alert } from '../models/alert.model.js';
import { AlertConfig } from '../models/alertConfig.model.js';
import { registrarActividad } from '../utils/actividad.js';
import { crearNotificacion } from '../utils/notificaciones.js';
import { respuestaExito, respuestaCreado, respuestaError, respuestaNoEncontrado } from '../utils/respuestas.js';

export const getAlertas = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        // Superadmin ve todas las alertas; tecnico solo las suyas
        const filtro = req.user.role === 'superadmin' ? {} : { userId: req.user._id };
        if (status) filtro.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [alertas, total] = await Promise.all([
            Alert.find(filtro).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Alert.countDocuments(filtro)
        ]);

        return respuestaExito(res, { alertas, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        return respuestaError(res, 'Error al obtener las alertas', 500, error.message);
    }
};

export const getConfigAlertas = async (req, res) => {
    try {
        const filtro = req.user.role === 'superadmin' ? {} : { userId: req.user._id };
        const configs = await AlertConfig.find(filtro).sort({ createdAt: -1 });
        return respuestaExito(res, { configs });
    } catch (error) {
        return respuestaError(res, 'Error al obtener las configuraciones', 500, error.message);
    }
};

export const crearConfigAlerta = async (req, res) => {
    try {
        const { stationId, source, metric, operator, threshold, active } = req.body;

        const config = await AlertConfig.create({
            userId: req.user._id,
            stationId, source, metric, operator, threshold,
            active: active ?? true
        });

        await registrarActividad(req.user._id, 'alerta_config_creada', req, { stationId, metric, threshold });
        await crearNotificacion(req.user._id, 'umbral_creado', 'Umbral de alerta creado', `Se ha configurado un umbral para ${metric} en la estación ${stationId}.`, '/alertas/config');

        return respuestaCreado(res, { config });
    } catch (error) {
        return respuestaError(res, 'Error al crear la configuración de alerta', 500, error.message);
    }
};

export const actualizarConfigAlerta = async (req, res) => {
    try {
        const config = await AlertConfig.findById(req.params.id);
        if (!config) return respuestaNoEncontrado(res, 'Configuración no encontrada');

        const esPropia = config.userId.toString() === req.user._id.toString();
        if (!esPropia && req.user.role !== 'superadmin') {
            return respuestaError(res, 'No tienes permiso para modificar esta configuración', 403);
        }

        const actualizado = await AlertConfig.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        await registrarActividad(req.user._id, 'alerta_config_actualizada', req, { configId: req.params.id });

        return respuestaExito(res, { config: actualizado });
    } catch (error) {
        return respuestaError(res, 'Error al actualizar la configuración', 500, error.message);
    }
};

export const eliminarConfigAlerta = async (req, res) => {
    try {
        const config = await AlertConfig.findById(req.params.id);
        if (!config) return respuestaNoEncontrado(res, 'Configuración no encontrada');

        const esPropia = config.userId.toString() === req.user._id.toString();
        if (!esPropia && req.user.role !== 'superadmin') {
            return respuestaError(res, 'No tienes permiso para eliminar esta configuración', 403);
        }

        await AlertConfig.findByIdAndDelete(req.params.id);
        await registrarActividad(req.user._id, 'alerta_config_eliminada', req, { configId: req.params.id });
        await crearNotificacion(req.user._id, 'umbral_eliminado', 'Umbral eliminado', 'Se ha eliminado una configuración de alerta.');

        return respuestaExito(res, { message: 'Configuración eliminada.' });
    } catch (error) {
        return respuestaError(res, 'Error al eliminar la configuración', 500, error.message);
    }
};

export const resolverAlerta = async (req, res) => {
    try {
        const alerta = await Alert.findById(req.params.id);
        if (!alerta) return respuestaNoEncontrado(res, 'Alerta no encontrada');

        const esPropia = alerta.userId.toString() === req.user._id.toString();
        if (!esPropia && req.user.role !== 'superadmin') {
            return respuestaError(res, 'No tienes permiso para resolver esta alerta', 403);
        }

        if (alerta.status === 'resolved') return respuestaError(res, 'La alerta ya está resuelta', 400);

        const actualizada = await Alert.findByIdAndUpdate(
            req.params.id,
            { status: 'resolved', resolvedAt: new Date() },
            { new: true }
        );

        await registrarActividad(req.user._id, 'alerta_resuelta', req, { alertaId: req.params.id });

        return respuestaExito(res, { alerta: actualizada });
    } catch (error) {
        return respuestaError(res, 'Error al resolver la alerta', 500, error.message);
    }
};
