import { Resend } from 'resend';
import { config, FRONTEND_URL } from '../config.js';

const resend = new Resend(config.resendApiKey);

const IDIOMAS_SOPORTADOS = ['es', 'en'];

const enviar = async (to, subject, html) => {
    const from = `${config.resendFromName} <${config.resendFrom}>`;
    try {
        const { error } = await resend.emails.send({ from, to, subject, html });
        if (error) throw new Error(`Resend: ${error.message}`);
    } catch (err) {
        throw new Error(`Resend: ${err?.message ?? String(err)}`);
    }
};

const cargarPlantilla = async (idioma, clave) => {
    const lang = IDIOMAS_SOPORTADOS.includes(idioma) ? idioma : 'es';
    try {
        const modulo = await import(`../emails/${lang}/${clave}.js`);
        return modulo.default;
    } catch {
        const fallback = await import(`../emails/es/${clave}.js`);
        return fallback.default;
    }
};

// ── Emails ─────────────────────────────────────────────────────────────────

export const enviarEmailVerificacion = async (to, nombre, token, idioma = 'es') => {
    const plantilla = await cargarPlantilla(idioma, 'verificacion');
    const url = `${FRONTEND_URL}/verificar-email?token=${token}`;
    const { subject, html } = plantilla({ nombre, url });
    await enviar(to, subject, html);
};

export const enviarEmailInvitacion = async (to, nombreAdmin, role, token, idioma = 'es') => {
    const plantilla = await cargarPlantilla(idioma, 'invitacion');
    const url = `${FRONTEND_URL}/invite/${token}`;
    const { subject, html } = plantilla({ nombreAdmin, role, url });
    await enviar(to, subject, html);
};

export const enviarEmailResetPassword = async (to, nombre, token, idioma = 'es') => {
    const plantilla = await cargarPlantilla(idioma, 'recuperarPassword');
    const url = `${FRONTEND_URL}/reset-password?token=${token}`;
    const { subject, html } = plantilla({ nombre, url });
    await enviar(to, subject, html);
};

export const enviarEmailAlertaCritica = async (to, nombre, alerta, idioma = 'es') => {
    const plantilla = await cargarPlantilla(idioma, 'alertaCritica');
    const urlAlertas = `${FRONTEND_URL}/alertas`;
    const { subject, html } = plantilla({ nombre, alerta, urlAlertas });
    await enviar(to, subject, html);
};

export const enviarEmailCuentaSuspendida = async (to, nombre, idioma = 'es') => {
    const plantilla = await cargarPlantilla(idioma, 'cuentaSuspendida');
    const { subject, html } = plantilla({ nombre });
    await enviar(to, subject, html);
};

export const enviarTicketSoporte = async (to, { asunto, descripcion, urgencia, usuario }) => {
    const col = urgencia === 'alta' ? '#ef4444' : urgencia === 'media' ? '#f59e0b' : '#22c55e';
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;border:1px solid #e5e7eb">
        <div style="background:#15803d;height:4px;border-radius:4px 4px 0 0;margin:-32px -32px 24px"></div>
        <h2 style="color:#111827;margin:0 0 8px">Nuevo ticket de soporte</h2>
        <span style="display:inline-block;background:${col}20;color:${col};border:1px solid ${col}40;padding:2px 12px;border-radius:999px;font-size:12px;font-weight:600">Urgencia: ${urgencia.toUpperCase()}</span>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="color:#374151;margin:0 0 4px"><strong>De:</strong> ${usuario.nombre} ${usuario.apellidos}</p>
        <p style="color:#374151;margin:0 0 4px"><strong>Email:</strong> ${usuario.email}</p>
        <p style="color:#374151;margin:0 0 20px"><strong>Rol:</strong> ${usuario.role}</p>
        <p style="color:#374151;margin:0 0 8px"><strong>Asunto:</strong> ${asunto}</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;color:#374151;line-height:1.6">${descripcion.replace(/\n/g, '<br>')}</div>
    </div>`;
    await enviar(to, `[Soporte] ${asunto} [${urgencia.toUpperCase()}]`, html);
};

export const enviarResumenSemanal = async (to, nombre, datos, idioma = 'es') => {
    const plantilla = await cargarPlantilla(idioma, 'resumenSemanal');
    const urlDashboard = `${FRONTEND_URL}/dashboard`;
    const { subject, html } = plantilla({ nombre, datos, urlDashboard });
    await enviar(to, subject, html);
};
