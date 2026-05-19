import { Router } from 'express';
import { getEstaciones, getEstacion, getDatosActuales, getHistorico } from '../controllers/stations.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de estaciones requieren autenticación
router.get('/', autenticarToken, getEstaciones);
router.get('/:id', autenticarToken, getEstacion);
router.get('/:id/data', autenticarToken, getDatosActuales);
router.get('/:id/history', autenticarToken, getHistorico);

export { router as stationsRoutes };
