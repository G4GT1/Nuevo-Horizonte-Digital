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
        subject: 'Weekly sensor summary — Horizonte Verde Digital',
        html: plantillaBase('Weekly sensor summary', `
            <h2 style="color:#f1f5f9;margin-top:0;">Weekly summary</h2>
            <p style="color:#94a3b8;">Hello <strong style="color:#e2e8f0;">${nombre}</strong>, here is your summary for
            <strong style="color:#e2e8f0;">${datos.desde}</strong> to <strong style="color:#e2e8f0;">${datos.hasta}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#0f172a;border-radius:8px;overflow:hidden;">
                <thead>
                    <tr style="background:#1e293b;">
                        <th style="color:#64748b;padding:10px 8px;text-align:left;">Station</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:left;">Source</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:center;">Avg. temp.</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:center;">Avg. hum.</th>
                        <th style="color:#64748b;padding:10px 8px;text-align:center;">Alerts</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
            ${boton('View full details', urlDashboard)}
        `, 'en')
    };
};
