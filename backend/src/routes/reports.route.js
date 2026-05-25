import { Router } from 'express';
import { exportarPDF, exportarExcel, getReportData, sendWeeklyNow } from '../controllers/reports.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/reports/export/pdf:
 *   get:
 *     summary: Exportar datos de estación en PDF
 *     tags: [Informes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [fieldclimate, cesens]
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Archivo PDF con datos del sensor
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Alumnado no puede exportar informes
 */
router.get('/data', autenticarToken, getReportData);
router.get('/export/pdf', autenticarToken, exportarPDF);
router.post('/weekly/send-now', autenticarToken, sendWeeklyNow);

/**
 * @swagger
 * /api/reports/export/excel:
 *   get:
 *     summary: Exportar datos de estación en Excel
 *     tags: [Informes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [fieldclimate, cesens]
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Archivo Excel (.xlsx) con datos del sensor
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/excel', autenticarToken, exportarExcel);

export { router as reportsRoutes };
