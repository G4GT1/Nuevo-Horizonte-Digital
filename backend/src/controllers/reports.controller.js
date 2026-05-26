import excel4node from 'excel4node';
import * as fieldclimate from '../services/fieldclimate.service.js';
import * as cesens from '../services/cesens.service.js';
import { enviarResumenSemanal } from '../services/email.service.js';
import { buildDatosEstaciones } from '../jobs/resumenSemanal.job.js';
import { registrarActividad } from '../utils/actividad.js';
import { respuestaError, respuestaExito } from '../utils/respuestas.js';

/* IDs de metricas Cesens incluidas en los informes */
const CESENS_METRICAS_REPORT = [1, 2, 6, 8, 12, 14, 28, 78, 95, 96];

// ── Agregacion ─────────────────────────────────────────────────────────────

/**
 * Calcula min, max y media de un array de valores numericos.
 * @param {(number|null)[]} vals
 * @param {number} [decimals=2]
 * @returns {{ min: number, max: number, avg: number } | null} null si no hay valores validos
 */
function calcStats(vals, decimals = 2) {
    const nums = vals.filter(v => v != null && !isNaN(Number(v))).map(Number);
    if (!nums.length) return null;
    const d = Math.min(decimals, 3);
    return {
        min: parseFloat(Math.min(...nums).toFixed(d)),
        max: parseFloat(Math.max(...nums).toFixed(d)),
        avg: parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(d)),
    };
}

/**
 * Construye el resultado final (resumen + desglose por dia) a partir del mapa de metricas.
 * @param {Record<string, { unidad: string, decimals: number, byDay: Record<string, number[]>, all: number[] }>} map
 * @returns {{ resumen: object[], dias: object[] }}
 */
function buildResult(map) {
    const resumen = Object.entries(map)
        .map(([nombre, { unidad, decimals, all }]) => {
            const s = calcStats(all, decimals);
            return s ? { nombre, unidad, ...s } : null;
        })
        .filter(Boolean);

    const allDays = new Set();
    Object.values(map).forEach(({ byDay }) => Object.keys(byDay).forEach(d => allDays.add(d)));

    const dias = [...allDays].sort().map(fecha => ({
        fecha,
        metricas: Object.entries(map)
            .map(([nombre, { unidad, decimals, byDay }]) => {
                const s = calcStats(byDay[fecha] ?? [], decimals);
                return s ? { nombre, unidad, ...s } : null;
            })
            .filter(Boolean),
    }));

    return { resumen, dias };
}

/**
 * Convierte timestamp FieldClimate a Date. Acepta Unix-segundos o ISO string.
 * @param {string|number} ts
 * @returns {Date|null}
 */
function fcFechaToDate(ts) {
    const n = Number(ts);
    if (!isNaN(n) && n > 1e9) return new Date(n * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Agrega datos brutos de FieldClimate en un mapa metrica→{byDay, all}.
 * Convierte bateria de mV a porcentaje (0-100%) y omite sensores serial/calculation.
 * @param {object} data - Respuesta cruda del servicio FieldClimate (dates + data[])
 * @returns {{ resumen: object[], dias: object[] }}
 */
function agregarFC(data) {
    const fechas   = Array.isArray(data?.dates) ? data.dates : [];
    const sensores = Array.isArray(data?.data)  ? data.data  : [];
    const map = {};

    sensores.forEach(sensor => {
        const nombreOrig =
            sensor.name_original ??
            (typeof sensor.name === 'object' ? sensor.name?.original : null) ??
            (typeof sensor.name === 'string'  ? sensor.name           : null) ?? '';
        if (/serial.?number|calculation/i.test(nombreOrig)) return;

        const nombre  = (typeof sensor.name === 'object' ? sensor.name?.custom : null) ?? nombreOrig;
        if (!nombre) return;

        const aggrKey = ['avg', 'last'].find(k => Array.isArray(sensor.values?.[k]))
            ?? Object.keys(sensor.values ?? {})[0];
        const vals    = sensor.values?.[aggrKey] ?? [];
        let decimals  = typeof sensor.decimals === 'number' ? sensor.decimals : 2;
        const esBat   = /battery/i.test(nombreOrig);

        fechas.forEach((ts, idx) => {
            let val = vals[idx];
            if (val == null) return;
            val = Number(val);
            if (isNaN(val)) return;
            if (esBat) { val = Math.min(100, Math.round((val / 7000) * 100)); decimals = 0; }

            const fechaObj = fcFechaToDate(ts);
            if (!fechaObj) return;
            const dia    = fechaObj.toISOString().split('T')[0];
            const unidad = esBat ? '%' : (sensor.unit ?? '');
            if (!map[nombre]) map[nombre] = { unidad, decimals, byDay: {}, all: [] };
            if (!map[nombre].byDay[dia]) map[nombre].byDay[dia] = [];
            map[nombre].byDay[dia].push(val);
            map[nombre].all.push(val);
        });
    });

    return buildResult(map);
}

/**
 * Agrega datos brutos de Cesens en un mapa metrica→{byDay, all}.
 * @param {Array<{ idMetrica: number, nombre: string, unidad: string, datos: Array<{ts: number, valor: number}> }>} datos
 * @returns {{ resumen: object[], dias: object[] }}
 */
function agregarCesens(datos) {
    const map = {};
    datos.forEach(metrica => {
        if (!Array.isArray(metrica.datos) || !metrica.datos.length) return;
        const nombre = metrica.nombre ?? `Métrica ${metrica.idMetrica}`;
        metrica.datos.forEach(({ ts, valor }) => {
            if (valor == null) return;
            const val = Number(valor);
            if (isNaN(val)) return;
            const dia = new Date(ts * 1000).toISOString().split('T')[0];
            if (!map[nombre]) map[nombre] = { unidad: metrica.unidad ?? '', decimals: 1, byDay: {}, all: [] };
            if (!map[nombre].byDay[dia]) map[nombre].byDay[dia] = [];
            map[nombre].byDay[dia].push(val);
            map[nombre].all.push(val);
        });
    });
    return buildResult(map);
}

/**
 * Descarga y agrega los datos historicos de una estacion para el rango indicado.
 * Despacha a FieldClimate o Cesens segun source.
 * @param {string} stationId
 * @param {'fieldclimate'|'cesens'} source
 * @param {string} from - YYYY-MM-DD
 * @param {string} to   - YYYY-MM-DD
 * @returns {Promise<{ resumen: object[], dias: object[] }>}
 */
async function fetchAgregado(stationId, source, from, to) {
    // Normaliza a YYYY-MM-DD — igual que getHistoricoFC en stations.controller
    const fromStr = String(from).slice(0, 10);
    const toStr   = String(to  ).slice(0, 10);

    // Valida formato antes de llamar al servicio
    const fromDate = new Date(`${fromStr}T00:00:00Z`);
    const toDate   = new Date(`${toStr}T23:59:59Z`);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error(`Fechas inválidas para informe: from="${from}", to="${to}"`);
    }
    const fromTs = Math.floor(fromDate.getTime() / 1000);
    const toTs   = Math.floor(toDate.getTime()   / 1000);

    if (source === 'fieldclimate') {
        console.log(`[reports] FC id=${stationId} from="${fromStr}" to="${toStr}" → ts ${fromTs}–${toTs}`);
        const raw = await fieldclimate.obtenerDatosEstacion(stationId, fromStr, toStr);
        console.log(`[reports] FC respuesta: ${Array.isArray(raw?.dates) ? raw.dates.length : 0} fechas, ${Array.isArray(raw?.data) ? raw.data.length : 0} sensores, primerTs=${raw?.dates?.[0]}`);
        return agregarFC(raw);
    }

    console.log(`[reports] Cesens id=${stationId} from="${fromStr}" to="${toStr}" → ts ${fromTs}–${toTs}`);
    const raw = await cesens.obtenerDatosHistorico(
        stationId, CESENS_METRICAS_REPORT, new Date(fromStr), new Date(toStr)
    );
    console.log(`[reports] Cesens respuesta: ${raw.length} métricas`);
    return agregarCesens(raw);
}

// ── Endpoints ──────────────────────────────────────────────────────────────

/**
 * GET /api/reports/data
 * Retorna datos agregados (resumen + desglose diario) de una estacion para un rango de fechas.
 * Usado por el cliente para generar el PDF con react-pdf.
 * @param {import('express').Request} req - query: { stationId, source, from, to }
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { stationId, source, from, to, resumen, dias }
 */
export const getReportData = async (req, res) => {
    try {
        const { stationId, source, from, to } = req.query;
        if (!stationId || !source || !from || !to)
            return respuestaError(res, 'Parámetros requeridos: stationId, source, from, to', 400);

        const agregado = await fetchAgregado(stationId, source, from, to);
        return respuestaExito(res, { stationId, source, from, to, ...agregado });
    } catch (error) {
        return respuestaError(res, 'Error al obtener datos del informe', 500, error.message);
    }
};

/**
 * GET /api/reports/export/excel
 * Genera y descarga un archivo .xlsx con el resumen del periodo y el detalle diario.
 * El nombre del archivo incluye stationId, from y to.
 * @param {import('express').Request} req - query: { stationId, source, from, to }
 * @param {import('express').Response} res
 * @returns {Promise<void>} Descarga .xlsx o 400/500 en caso de error
 */
export const exportarExcel = async (req, res) => {
    try {
        const { stationId, source, from, to } = req.query;
        if (!stationId || !source || !from || !to)
            return respuestaError(res, 'Parámetros requeridos: stationId, source, from, to', 400);

        const { resumen, dias } = await fetchAgregado(stationId, source, from, to);

        const wb  = new excel4node.Workbook();
        const C_GREEN     = '#166534';
        const C_GREEN_ALT = '#15803d';
        const C_GREEN_BG  = '#f0fdf4';

        const styleHdr = wb.createStyle({
            font: { bold: true, color: '#FFFFFF', size: 11 },
            fill: { type: 'pattern', patternType: 'solid', fgColor: C_GREEN },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { bottom: { style: 'thin', color: C_GREEN_ALT } },
        });
        const styleCell = wb.createStyle({ font: { size: 10 }, alignment: { vertical: 'center' } });
        const styleCellAlt = wb.createStyle({
            font: { size: 10 }, alignment: { vertical: 'center' },
            fill: { type: 'pattern', patternType: 'solid', fgColor: C_GREEN_BG },
        });
        const styleNum = wb.createStyle({
            font: { size: 10 }, alignment: { horizontal: 'right', vertical: 'center' },
            numberFormat: '#,##0.00',
        });
        const styleTitle = wb.createStyle({
            font: { bold: true, size: 13, color: C_GREEN },
            alignment: { vertical: 'center' },
        });

        // ── Hoja 1: Resumen ──────────────────────────────────────────────
        const ws1 = wb.addWorksheet('Resumen del período');
        ws1.row(1).setHeight(28);
        ws1.cell(1, 1, 1, 5, true).string(
            `Horizonte Verde Digital — ${stationId} · ${from} — ${to}`
        ).style(styleTitle);

        ws1.row(2).setHeight(22);
        ['Métrica', 'Unidad', 'Mínimo', 'Máximo', 'Media'].forEach((h, i) =>
            ws1.cell(2, i + 1).string(h).style(styleHdr)
        );

        resumen.forEach((m, i) => {
            const r = i + 3;
            const s = i % 2 === 0 ? styleCell : styleCellAlt;
            ws1.cell(r, 1).string(m.nombre).style(s);
            ws1.cell(r, 2).string(m.unidad || '—').style(s);
            ws1.cell(r, 3).number(Number(m.min)).style(styleNum);
            ws1.cell(r, 4).number(Number(m.max)).style(styleNum);
            ws1.cell(r, 5).number(Number(m.avg)).style(styleNum);
        });
        [32, 12, 12, 12, 12].forEach((w, i) => ws1.column(i + 1).setWidth(w));

        // ── Hoja 2: Detalle diario ───────────────────────────────────────
        const ws2 = wb.addWorksheet('Detalle diario');
        ws2.row(1).setHeight(22);
        ['Fecha', 'Métrica', 'Unidad', 'Mínimo', 'Máximo', 'Media'].forEach((h, i) =>
            ws2.cell(1, i + 1).string(h).style(styleHdr)
        );

        let row = 2;
        dias.forEach(dia => {
            dia.metricas.forEach((m, mi) => {
                const s = mi % 2 === 0 ? styleCell : styleCellAlt;
                ws2.cell(row, 1).string(dia.fecha).style(s);
                ws2.cell(row, 2).string(m.nombre).style(s);
                ws2.cell(row, 3).string(m.unidad || '—').style(s);
                ws2.cell(row, 4).number(Number(m.min)).style(styleNum);
                ws2.cell(row, 5).number(Number(m.max)).style(styleNum);
                ws2.cell(row, 6).number(Number(m.avg)).style(styleNum);
                row++;
            });
        });
        [14, 32, 12, 12, 12, 12].forEach((w, i) => ws2.column(i + 1).setWidth(w));

        const filename = `informe_${stationId}_${from}_${to}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        wb.write(filename, res);

        await registrarActividad(req.user._id, 'exportacion_excel', req, { stationId, source, from, to });
    } catch (error) {
        if (!res.headersSent) return respuestaError(res, 'Error al generar el Excel', 500, error.message);
    }
};

/**
 * GET /api/reports/export/pdf
 * El PDF se genera en el cliente con react-pdf. Este endpoint devuelve 400 para indicarlo.
 * Se mantiene registrado para evitar 404 y compatibilidad con la documentacion Swagger.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} 400 siempre
 */
export const exportarPDF = async (req, res) => {
    return respuestaError(res, 'El PDF se genera en el cliente. Usa GET /api/reports/data para los datos.', 400);
};

// ── Envio inmediato del resumen semanal (demo/prueba) ─────────────────────────

/**
 * POST /api/reports/weekly/send-now
 * Genera y envia el resumen semanal de los ultimos 7 dias al usuario autenticado.
 * Reutiliza la misma logica que el cron semanal (buildDatosEstaciones).
 * @param {import('express').Request} req - req.user del token
 * @param {import('express').Response} res
 * @returns {Promise<void>} 200 con { message, estaciones }
 */
export const sendWeeklyNow = async (req, res) => {
    try {
        const usuario    = req.user;
        const hoy        = new Date();
        const haceSemana = new Date(hoy);
        haceSemana.setDate(hoy.getDate() - 7);
        const desde = haceSemana.toISOString().split('T')[0];
        const hasta  = hoy.toISOString().split('T')[0];

        // Reutiliza la misma lógica que el cron (con todos los fixes de FC/Cesens)
        const estacionesResumen = await buildDatosEstaciones({ desde, hasta, haceSemana, hoy });

        const datos = {
            desde: haceSemana.toLocaleDateString('es-ES'),
            hasta:  hoy.toLocaleDateString('es-ES'),
            estaciones: estacionesResumen,
        };

        // Nombre con fallback a email
        const nombreUsuario = usuario.nombre?.trim() || usuario.email;

        await enviarResumenSemanal(usuario.email, nombreUsuario, datos, usuario.preferences?.language);
        await registrarActividad(usuario._id, 'resumen_semanal_manual', req, { estaciones: estacionesResumen.length });

        return respuestaExito(res, {
            message: `Resumen semanal enviado a ${usuario.email}`,
            estaciones: estacionesResumen.length,
        });
    } catch (error) {
        return respuestaError(res, 'Error al enviar el resumen semanal', 500, error.message);
    }
};
