import { Router } from 'express';
import { chat, buscar } from '../controllers/ai.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';
import { validarMensajeChat, validarBusqueda } from '../validators/ai.validator.js';

const router = Router();

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chatbot agrícola con IA (Groq / Llama 3.3-70b)
 *     description: Responde preguntas sobre agronomía y uso de la plataforma. Disponible para todos los roles.
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatBody'
 *     responses:
 *       200:
 *         description: Respuesta del asistente virtual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 respuesta:
 *                   type: string
 */
router.post('/chat', autenticarToken, validarMensajeChat, chat);

/**
 * @swagger
 * /api/ai/search:
 *   post:
 *     summary: Buscador inteligente sobre datos reales de sensores
 *     description: Inyecta datos actuales de sensores como contexto y responde en lenguaje natural.
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BusquedaBody'
 *     responses:
 *       200:
 *         description: Análisis inteligente de los datos de sensores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 respuesta:
 *                   type: string
 */
router.post('/search', autenticarToken, validarBusqueda, buscar);

export { router as aiRoutes };
