import { Resend } from 'resend';
import { RESEND_API_KEY, EMAIL_FROM, FRONTEND_URL } from '../config.js';

const resend = new Resend(RESEND_API_KEY);

const enviar = async (to, subject, html) => {
    const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    if (error) throw new Error(`Error enviando email a ${to}: ${error.message}`);
};

// ── Plantilla base ─────────────────────────────────────────────────────────

const plantillaBase = (titulo, contenido) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;max-width:600px;">
          <tr>
            <td style="background:#166534;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🌱 Horizonte Verde Digital</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${contenido}
            </td>
          </tr>
          <tr>
            <td style="background:#0f172a;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">IES Galileo Galilei · Córdoba, España</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const boton = (texto, url) =>
    `<a href="${url}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0;">${texto}</a>`;

// ── Emails ─────────────────────────────────────────────────────────────────

export const enviarEmailVerificacion = async (to, nombre, token) => {
    const url = `${FRONTEND_URL}/verificar-email?token=${token}`;
    const html = plantillaBase('Verifica tu cuenta', `
        <h2 style="color:#f1f5f9;margin-top:0;">Hola, ${nombre} 👋</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Gracias por registrarte en Horizonte Verde Digital. Para activar tu cuenta
            pulsa el botón. El enlace expira en <strong style="color:#e2e8f0;">24 horas</strong>.
        </p>
        ${boton('Verificar mi cuenta', url)}
        <p style="color:#64748b;font-size:13px;">Si no creaste esta cuenta, ignora este email.</p>
    `);
    await enviar(to, 'Verifica tu cuenta — Horizonte Verde Digital', html);
};

export const enviarEmailInvitacion = async (to, nombreAdmin, role, token) => {
    const url = `${FRONTEND_URL}/invitacion?token=${token}`;
    const rolesTexto = { superadmin: 'SuperAdmin', tecnico: 'Técnico', alumnado: 'Alumnado' };
    const html = plantillaBase('Has sido invitado', `
        <h2 style="color:#f1f5f9;margin-top:0;">Has sido invitado a la plataforma</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            <strong style="color:#e2e8f0;">${nombreAdmin}</strong> te ha invitado con el rol de
            <strong style="color:#16a34a;">${rolesTexto[role]}</strong>.
            Solo tienes que crear tu contraseña para entrar.
        </p>
        <p style="color:#94a3b8;line-height:1.6;">
            El enlace expira en <strong style="color:#e2e8f0;">72 horas</strong>.
        </p>
        ${boton('Aceptar invitación', url)}
        <p style="color:#64748b;font-size:13px;">Si no esperabas esta invitación, ignora este email.</p>
    `);
    await enviar(to, 'Invitación a Horizonte Verde Digital', html);
};

export const enviarEmailResetPassword = async (to, nombre, token) => {
    const url = `${FRONTEND_URL}/reset-password?token=${token}`;
    const html = plantillaBase('Restablece tu contraseña', `
        <h2 style="color:#f1f5f9;margin-top:0;">Restablecer contraseña</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Hola <strong style="color:#e2e8f0;">${nombre}</strong>, recibimos una solicitud para
            restablecer tu contraseña. El enlace expira en <strong style="color:#e2e8f0;">1 hora</strong>.
        </p>
        ${boton('Restablecer contraseña', url)}
        <p style="color:#64748b;font-size:13px;">Si no solicitaste este cambio, ignora este email.</p>
    `);
    await enviar(to, 'Restablece tu contraseña — Horizonte Verde Digital', html);
};

export const enviarEmailAlertaCritica = async (to, nombre, alerta) => {
    const html = plantillaBase('⚠️ Alerta crítica de sensor', `
        <h2 style="color:#f87171;margin-top:0;">⚠️ Alerta crítica detectada</h2>
        <p style="color:#94a3b8;line-height:1.6;">Hola <strong style="color:#e2e8f0;">${nombre}</strong>,</p>
        <table style="width:100%;background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;border-collapse:collapse;">
            <tr><td style="color:#64748b;padding:6px 0;width:140px;">Estación</td><td style="color:#e2e8f0;font-weight:600;">${alerta.stationName}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Métrica</td><td style="color:#e2e8f0;font-weight:600;">${alerta.metric}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Valor detectado</td><td style="color:#f87171;font-weight:700;font-size:18px;">${alerta.value}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Umbral configurado</td><td style="color:#e2e8f0;">${alerta.threshold}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Mensaje</td><td style="color:#e2e8f0;">${alerta.message}</td></tr>
        </table>
        ${boton('Ver alertas en la plataforma', `${FRONTEND_URL}/alertas`)}
    `);
    await enviar(to, `⚠️ Alerta crítica: ${alerta.stationName} — ${alerta.metric}`, html);
};

export const enviarEmailCuentaSuspendida = async (to, nombre) => {
    const html = plantillaBase('Cuenta suspendida', `
        <h2 style="color:#f87171;margin-top:0;">Tu cuenta ha sido suspendida</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Hola <strong style="color:#e2e8f0;">${nombre}</strong>, tu acceso a Horizonte Verde Digital
            ha sido suspendido por un administrador.
        </p>
        <p style="color:#94a3b8;line-height:1.6;">
            Para más información contacta con el administrador de la plataforma.
        </p>
    `);
    await enviar(to, 'Tu cuenta ha sido suspendida — Horizonte Verde Digital', html);
};

export const enviarResumenSemanal = async (to, nombre, datos) => {
    const filas = datos.estaciones.map(e => `
        <tr>
            <td style="color:#e2e8f0;padding:10px 8px;font-weight:600;border-bottom:1px solid #1e293b;">${e.nombre}</td>
            <td style="color:#94a3b8;padding:10px 8px;border-bottom:1px solid #1e293b;">${e.fuente}</td>
            <td style="color:#60a5fa;padding:10px 8px;text-align:center;border-bottom:1px solid #1e293b;">${e.temperatura?.media ?? '—'} °C</td>
            <td style="color:#34d399;padding:10px 8px;text-align:center;border-bottom:1px solid #1e293b;">${e.humedad?.media ?? '—'} %</td>
            <td style="color:#f59e0b;padding:10px 8px;text-align:center;border-bottom:1px solid #1e293b;">${e.alertas ?? 0}</td>
        </tr>
    `).join('');

    const html = plantillaBase('Resumen semanal de sensores', `
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
        ${boton('Ver detalles completos', `${FRONTEND_URL}/dashboard`)}
    `);
    await enviar(to, 'Resumen semanal de sensores — Horizonte Verde Digital', html);
};
