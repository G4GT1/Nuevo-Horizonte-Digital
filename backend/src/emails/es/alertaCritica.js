import { plantillaBase, boton, infoBox } from '../base.js';

export default ({ nombre, alerta, urlAlertas }) => ({
    subject: `Alerta crítica: ${alerta.stationName} — ${alerta.metric}`,
    html: plantillaBase('Alerta crítica de sensor', `
        <p style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;
                  padding:3px 10px;border-radius:4px;border:1px solid #fecaca;margin:0 0 20px;letter-spacing:0.5px;">
            ALERTA CRÍTICA
        </p>
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Se ha detectado un valor crítico
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            Hola <strong style="color:#111827;">${nombre}</strong>, uno de tus sensores ha superado
            el umbral configurado y requiere atención inmediata.
        </p>
        ${infoBox([
            ['Estación',            alerta.stationName, false],
            ['Métrica',             alerta.metric,      false],
            ['Valor detectado',     alerta.value,       true],
            ['Umbral configurado',  alerta.threshold,   false],
            ['Mensaje',             alerta.message,     false],
        ], '#dc2626')}
        ${boton('Ver alertas en la plataforma', urlAlertas, '#dc2626')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            Puedes gestionar tus alertas desde el panel de control.
        </p>
    `, '#dc2626', 'es'),
});
