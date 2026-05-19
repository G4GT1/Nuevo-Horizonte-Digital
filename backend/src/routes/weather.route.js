import { Router } from 'express';
import { getPrediccion } from '../controllers/weather.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', autenticarToken, getPrediccion);

export { router as weatherRoutes };
