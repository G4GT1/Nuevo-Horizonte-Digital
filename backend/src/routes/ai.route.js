import { Router } from 'express';
import { chat, buscar, ayuda, ticket } from '../controllers/ai.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';
import { validarMensajeChat, validarBusqueda, validarTicket } from '../validators/ai.validator.js';

const router = Router();

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chatbot contextual con datos de estaciones en tiempo real
 *     description: Envia un historial de mensajes. El servidor inyecta el contexto de estaciones (cacheado 5 min) en el system prompt. Solo se usan los ultimos 10 mensajes.
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Respuesta del chatbot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.post('/chat',   autenticarToken, validarMensajeChat, chat);

/**
 * @swagger
 * /api/ai/search:
 *   post:
 *     summary: Busqueda semantica en datos de estaciones
 *     description: Formula una pregunta en lenguaje natural y el LLM responde usando los datos actuales de todas las estaciones como contexto.
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pregunta]
 *             properties:
 *               pregunta:
 *                 type: string
 *                 example: "¿Cual es la temperatura mas alta registrada hoy?"
 *     responses:
 *       200:
 *         description: Resultado de la busqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 respuesta:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.post('/search', autenticarToken, validarBusqueda, buscar);

/**
 * @swagger
 * /api/ai/help:
 *   post:
 *     summary: Asistente de ayuda de la plataforma
 *     description: Responde preguntas sobre el uso de la aplicacion. No usa contexto de estaciones.
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Respuesta del asistente de ayuda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.post('/help',   autenticarToken, validarMensajeChat, ayuda);

/**
 * @swagger
 * /api/ai/ticket:
 *   post:
 *     summary: Enviar ticket de soporte al administrador
 *     description: Envia un email con el ticket al ADMIN_EMAIL configurado. Solo superadmin y tecnico.
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [asunto, descripcion, urgencia]
 *             properties:
 *               asunto:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               urgencia:
 *                 type: string
 *                 enum: [baja, media, alta, critica]
 *     responses:
 *       200:
 *         description: Ticket enviado correctamente
 *       403:
 *         description: Acceso denegado (requiere superadmin o tecnico)
 */
router.post('/ticket', autenticarToken, autorizarRol(['superadmin', 'tecnico']), validarTicket, ticket);

export { router as aiRoutes };
