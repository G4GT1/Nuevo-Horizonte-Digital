import { plantillaBase, boton } from '../base.js';

export default ({ nombre, alerta, urlAlertas }) => ({
    subject: `⚠️ Alerta crítica: ${alerta.stationName} — ${alerta.metric}`,
    html: plantillaBase('⚠️ Alerta crítica de sensor', `
        <h2 style="color:#f87171;margin-top:0;">⚠️ Alerta crítica detectada</h2>
        <p style="color:#94a3b8;line-height:1.6;">Hola <strong style="color:#e2e8f0;">${nombre}</strong>,</p>
        <table style="width:100%;background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;border-collapse:collapse;">
            <tr><td style="color:#64748b;padding:6px 0;width:140px;">Estación</td><td style="color:#e2e8f0;font-weight:600;">${alerta.stationName}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Métrica</td><td style="color:#e2e8f0;font-weight:600;">${alerta.metric}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Valor detectado</td><td style="color:#f87171;font-weight:700;font-size:18px;">${alerta.value}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Umbral configurado</td><td style="color:#e2e8f0;">${alerta.threshold}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Mensaje</td><td style="color:#e2e8f0;">${alerta.message}</td></tr>
        </table>
        ${boton('Ver alertas en la plataforma', urlAlertas)}
    `, 'es')
});
