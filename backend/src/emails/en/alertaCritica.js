import { plantillaBase, boton, infoBox } from '../base.js';

export default ({ nombre, alerta, urlAlertas }) => ({
    subject: `Critical alert: ${alerta.stationName} — ${alerta.metric}`,
    html: plantillaBase('Critical sensor alert', `
        <p style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;
                  padding:3px 10px;border-radius:4px;border:1px solid #fecaca;margin:0 0 20px;letter-spacing:0.5px;">
            CRITICAL ALERT
        </p>
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            A critical value has been detected
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            Hello <strong style="color:#111827;">${nombre}</strong>, one of your sensors has exceeded
            the configured threshold and requires immediate attention.
        </p>
        ${infoBox([
            ['Station',              alerta.stationName, false],
            ['Metric',               alerta.metric,      false],
            ['Detected value',       alerta.value,       true],
            ['Configured threshold', alerta.threshold,   false],
            ['Message',              alerta.message,     false],
        ], '#dc2626')}
        ${boton('View alerts on the platform', urlAlertas, '#dc2626')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            You can manage your alerts from the platform control panel.
        </p>
    `, '#dc2626', 'en'),
});
