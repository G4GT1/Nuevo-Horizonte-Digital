import { Router } from 'express';
import { exportarPDF, exportarExcel, getReportData, sendWeeklyNow } from '../controllers/reports.controller.js';
import { autenticarToken } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/reports/data:
 *   get:
 *     summary: Obtener datos agregados para informe (resumen + desglose diario)
 *     description: Devuelve min/max/media por metrica para el periodo y el detalle por dia. Usado por el cliente para generar el PDF con react-pdf.
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
 *         description: Datos del informe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stationId:
 *                   type: string
 *                 source:
 *                   type: string
 *                 from:
 *                   type: string
 *                 to:
 *                   type: string
 *                 resumen:
 *                   type: array
 *                 dias:
 *                   type: array
 *       400:
 *         description: Parametros requeridos faltantes
 */
router.get('/data', autenticarToken, getReportData);

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
router.get('/export/pdf', autenticarToken, exportarPDF);

/**
 * @swagger
 * /api/reports/weekly/send-now:
 *   post:
 *     summary: Enviar resumen semanal inmediatamente al usuario autenticado
 *     description: Genera el resumen de los ultimos 7 dias usando la misma logica del cron y lo envia por email.
 *     tags: [Informes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen enviado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 estaciones:
 *                   type: integer
 *       401:
 *         description: No autenticado
 */
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
