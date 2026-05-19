import { plantillaBase, boton } from '../base.js';

export default ({ nombre, datos, urlDashboard }) => {
    const filas = datos.estaciones.map(e => `
        <tr>
            <td style="color:#e2e8f0;padding:10px 8px;font-weight:600;border-bottom:1px solid #1e293b;">${e.nombre}</td>
            <td style="color:#94a3b8;padding:10px 8px;border-bottom:1px solid #1e293b;">${e.fuente}</td>
            <td style="color:#60a5fa;padding:10px 8px;text-align:center;border-bottom:1px solid #1e293b;">${e.temperatura?.media ?? '—'} °C</td>
            <td style="color:#34d399;padding:10px 8px;text-align:center;border-bottom:1px solid #1e293b;">${e.humedad?.media ?? '—'} %</td>
            <td style="color:#f59e0b;padding:10px 8px;text-align:center;border-bottom:1px solid #1e293b;">${e.alertas ?? 0}</td>
        </tr>
    `).join('');

    return {
        subject: 'Resumen semanal de sensores — Horizonte Verde Digital',
        html: plantillaBase('Resumen semanal de sensores', `
            <h2 style="color:#f1f5f9;margin-top:0;">Resumen semanal</h2>
            <p style="color:#94a3b8;">Hola <strong style="color:#e2e8f0;">${nombre}</strong>, aquí tienes el resumen del
            <strong style="color:#e2e8f0;">${datos.desde}</strong> al <strong style="color:#e2e8f0;">${datos.hasta}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#0f172a;border-radius:8px;overflow:hidden;">
                <thead>
                    <tr style="background:#1e293b;">
                        <th style="color:#64748b;padding:10px 8px;text-align:left;">Estación</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:left;">Fuente</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:center;">Temp. media</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:center;">Hum. media</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:center;">Alertas</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
            ${boton('Ver detalles completos', urlDashboard)}
        `, 'es')
    };
};
