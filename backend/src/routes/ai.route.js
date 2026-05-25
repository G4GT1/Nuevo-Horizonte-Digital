import { Router } from 'express';
import { chat, buscar, ayuda, ticket } from '../controllers/ai.controller.js';
import { autenticarToken, autorizarRol } from '../middlewares/auth.middleware.js';
import { validarMensajeChat, validarBusqueda, validarTicket } from '../validators/ai.validator.js';

const router = Router();

router.post('/chat',   autenticarToken, validarMensajeChat, chat);
router.post('/search', autenticarToken, validarBusqueda, buscar);
router.post('/help',   autenticarToken, validarMensajeChat, ayuda);
router.post('/ticket', autenticarToken, autorizarRol(['superadmin', 'tecnico']), validarTicket, ticket);

export { router as aiRoutes };
