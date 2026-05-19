import { Router } from 'express';
import {
    getAlertas, getConfigAlertas, crearConfigAlerta,
    actualizarConfigAlerta, eliminarConfigAlerta, resolverAlerta
} from '../controllers/alerts.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';
import { validarId, validarConfigAlerta } from '../validators/alerts.validator.js';

const router = Router();

router.use(autenticarToken);

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Listar alertas disparadas
 *     description: SuperAdmin ve todas. Técnico solo ve las suyas.
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alertas
 *       403:
 *         description: Rol insuficiente (alumnado no puede acceder)
 */
router.get('/', autorizarRol(['superadmin', 'tecnico']), getAlertas);

/**
 * @swagger
 * /api/alerts/config:
 *   get:
 *     summary: Listar configuraciones de umbrales
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de umbrales configurados
 *   post:
 *     summary: Crear configuración de umbral
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigAlertaBody'
 *     responses:
 *       201:
 *         description: Umbral creado
 */
router.get('/config', autorizarRol(['superadmin', 'tecnico']), getConfigAlertas);
router.post('/config', autorizarRol(['superadmin', 'tecnico']), validarConfigAlerta, crearConfigAlerta);

/**
 * @swagger
 * /api/alerts/config/{id}:
 *   put:
 *     summary: Actualizar configuración de umbral
 *     tags: [Alertas]
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
 *             $ref: '#/components/schemas/ConfigAlertaBody'
 *     responses:
 *       200:
 *         description: Umbral actualizado
 *       403:
 *         description: No tienes permiso para modificar este umbral
 *   delete:
 *     summary: Eliminar configuración de umbral
 *     tags: [Alertas]
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
 *         description: Umbral eliminado
 */
router.put('/config/:id', autorizarRol(['superadmin', 'tecnico']), validarId, validarConfigAlerta, actualizarConfigAlerta);
router.delete('/config/:id', autorizarRol(['superadmin', 'tecnico']), validarId, eliminarConfigAlerta);

/**
 * @swagger
 * /api/alerts/{id}/resolve:
 *   put:
 *     summary: Marcar alerta como resuelta
 *     tags: [Alertas]
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
 *         description: Alerta marcada como resuelta
 *       400:
 *         description: Alerta ya resuelta
 *       403:
 *         description: No tienes permiso para resolver esta alerta
 */
router.put('/:id/resolve', autorizarRol(['superadmin', 'tecnico']), validarId, resolverAlerta);

export { router as alertsRoutes };
