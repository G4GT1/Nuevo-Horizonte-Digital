import { Router } from 'express';
import { exportarPDF, exportarExcel } from '../controllers/reports.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Requieren autenticación — query params: stationId, from, to
router.get('/export/pdf', autenticarToken, exportarPDF);
router.get('/export/excel', autenticarToken, exportarExcel);

export { router as reportsRoutes };
