import PDFDocument from 'pdfkit';
import excel4node from 'excel4node';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { registrarActividad } from '../utils/actividad.js';
import { respuestaError } from '../utils/respuestas.js';

const NOMBRE_METRICAS = {
    1: 'Temperatura (°C)', 2: 'Humectación foliar', 6: 'Humedad relativa (%)',
    8: 'Presión (hPa)', 28: 'VWC suelo 20cm', 12: 'Cesens Mini 12',
    14: 'Cesens Mini 14', 78: 'Cesens Mini 78', 95: 'Cesens Mini 95', 96: 'Cesens Mini 96'
};

const obtenerDatos = async (stationId, source, from, to) => {
    if (source === 'fieldclimate') return fieldclimate.obtenerDatosEstacion(stationId, from, to);
    return cesens.obtenerDatosMetrica(stationId, 1, new Date(from), new Date(to));
};

export const exportarPDF = async (req, res) => {
    try {
        const { stationId, source, from, to } = req.query;

        if (!stationId || !source || !from || !to) {
            return respuestaError(res, 'Parámetros requeridos: stationId, source, from, to', 400);
        }

        const datos = await obtenerDatos(stationId, source, from, to);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=informe_${stationId}_${from}_${to}.pdf`);
        doc.pipe(res);

        // Cabecera
        doc.rect(0, 0, doc.page.width, 70).fill('#166534');
        doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
            .text('🌱 Horizonte Verde Digital', 40, 20);
        doc.fontSize(10).font('Helvetica')
            .text(`Informe de estación: ${stationId} | ${source}`, 40, 44);

        doc.fillColor('#1e293b').rect(0, 70, doc.page.width, 30).fill();
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
            .text(`Período: ${from} — ${to}  |  Generado: ${new Date().toLocaleString('es-ES')}`, 40, 80);

        doc.moveDown(3);
        doc.fillColor('#0f172a');

        // Contenido de datos (simplificado — los datos reales dependen de la estructura de cada API)
        doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('Resumen de mediciones', 40, 120);
        doc.moveTo(40, 138).lineTo(doc.page.width - 40, 138).strokeColor('#334155').stroke();

        const texto = JSON.stringify(datos, null, 2).substring(0, 3000);
        doc.fillColor('#334155').fontSize(8).font('Courier').text(texto, 40, 148);

        doc.end();

        await registrarActividad(req.user._id, 'exportacion_pdf', req, { stationId, source, from, to });
    } catch (error) {
        if (!res.headersSent) {
            return respuestaError(res, 'Error al generar el informe PDF', 500, error.message);
        }
    }
};

export const exportarExcel = async (req, res) => {
    try {
        const { stationId, source, from, to } = req.query;

        if (!stationId || !source || !from || !to) {
            return respuestaError(res, 'Parámetros requeridos: stationId, source, from, to', 400);
        }

        const datos = await obtenerDatos(stationId, source, from, to);

        const wb = new excel4node.Workbook();
        const ws = wb.addWorksheet('Datos de sensores');

        const estiloHeader = wb.createStyle({
            font: { bold: true, color: '#FFFFFF', size: 11 },
            fill: { type: 'pattern', patternType: 'solid', fgColor: '#166534' },
            alignment: { horizontal: 'center' }
        });

        const estiloCelda = wb.createStyle({
            font: { size: 10 },
            alignment: { horizontal: 'left' }
        });

        // Cabecera
        ws.cell(1, 1).string('Timestamp').style(estiloHeader);
        ws.cell(1, 2).string('Métrica').style(estiloHeader);
        ws.cell(1, 3).string('Valor').style(estiloHeader);
        ws.cell(1, 4).string('Estación').style(estiloHeader);
        ws.cell(1, 5).string('Fuente').style(estiloHeader);

        // Datos (la estructura exacta depende de la API; aquí volcamos lo que haya)
        const filas = Array.isArray(datos) ? datos : [datos];
        filas.forEach((fila, i) => {
            const row = i + 2;
            ws.cell(row, 1).string(fila?.date ?? fila?.timestamp ?? '').style(estiloCelda);
            ws.cell(row, 2).string(fila?.name ?? fila?.metric ?? '').style(estiloCelda);
            ws.cell(row, 3).string(String(fila?.value ?? '')).style(estiloCelda);
            ws.cell(row, 4).string(stationId).style(estiloCelda);
            ws.cell(row, 5).string(source).style(estiloCelda);
        });

        ws.column(1).setWidth(20);
        ws.column(2).setWidth(25);
        ws.column(3).setWidth(12);
        ws.column(4).setWidth(20);
        ws.column(5).setWidth(15);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=informe_${stationId}_${from}_${to}.xlsx`);

        wb.write(`informe_${stationId}.xlsx`, res);

        await registrarActividad(req.user._id, 'exportacion_excel', req, { stationId, source, from, to });
    } catch (error) {
        if (!res.headersSent) {
            return respuestaError(res, 'Error al generar el informe Excel', 500, error.message);
        }
    }
};
