import { plantillaBase, boton } from '../base.js';

const stat = (v) => (v != null ? v : '—');

export default ({ nombre, datos, urlDashboard }) => {
    const filas = datos.estaciones.map(e => `
        <tr>
          <td style="padding:11px 16px;font-weight:600;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;">
            ${e.nombre}
          </td>
          <td style="padding:11px 16px;font-size:12px;border-bottom:1px solid #f3f4f6;">
            <span style="background:${e.fuente === 'FieldClimate' ? '#dbeafe' : '#dcfce7'};
                         color:${e.fuente === 'FieldClimate' ? '#1d4ed8' : '#15803d'};
                         padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">
              ${e.fuente === 'FieldClimate' ? 'FC' : 'CS'}
            </span>
          </td>
          <td style="padding:11px 16px;text-align:center;color:#2563eb;font-weight:700;font-size:13px;border-bottom:1px solid #f3f4f6;">
            ${stat(e.temperatura?.media)}${e.temperatura?.media != null ? ' °C' : ''}
          </td>
          <td style="padding:11px 16px;text-align:center;color:#16a34a;font-weight:700;font-size:13px;border-bottom:1px solid #f3f4f6;">
            ${stat(e.humedad?.media)}${e.humedad?.media != null ? ' %' : ''}
          </td>
          <td style="padding:11px 16px;text-align:center;font-size:13px;border-bottom:1px solid #f3f4f6;">
            <span style="color:${e.alertas > 0 ? '#dc2626' : '#6b7280'};font-weight:${e.alertas > 0 ? '700' : '400'};">
              ${e.alertas ?? 0}
            </span>
          </td>
        </tr>
    `).join('');

    return {
        subject: 'Resumen semanal de sensores — Horizonte Verde Digital',
        html: plantillaBase('Resumen semanal', `
            <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
                Resumen semanal de sensores
            </h2>
            <p style="color:#4b5563;line-height:1.7;margin:0 0 24px;font-size:14px;">
                Hola <strong style="color:#111827;">${nombre}</strong>, aquí tienes el resumen de tus estaciones
                del <strong style="color:#111827;">${datos.desde}</strong>
                al <strong style="color:#111827;">${datos.hasta}</strong>.
            </p>

            <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Estación</th>
                  <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Fuente</th>
                  <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Temp. media</th>
                  <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Hum. media</th>
                  <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Alertas</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>

            ${boton('Ver detalles completos', urlDashboard, '#16a34a')}
            <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
                Puedes gestionar tus preferencias de notificación desde tu perfil.
            </p>
        `, '#16a34a', 'es'),
    };
};
