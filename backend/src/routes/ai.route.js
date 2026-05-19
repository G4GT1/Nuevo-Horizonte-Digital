import { Router } from 'express';
import { chat, buscar } from '../controllers/ai.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';
import { validarMensajeChat, validarBusqueda } from '../validators/ai.validator.js';

const router = Router();

router.post('/chat', autenticarToken, validarMensajeChat, chat);
router.post('/search', autenticarToken, validarBusqueda, buscar);

export { router as aiRoutes };
