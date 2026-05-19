import { Resend } from 'resend';
import { createRequire } from 'module';
import { RESEND_API_KEY, EMAIL_FROM, FRONTEND_URL } from '../config.js';

const resend = new Resend(RESEND_API_KEY);

const IDIOMAS_SOPORTADOS = ['es', 'en'];

const enviar = async (to, subject, html) => {
    const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    if (error) throw new Error(`Error enviando email a ${to}: ${error.message}`);
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
    const url = `${FRONTEND_URL}/invitacion?token=${token}`;
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

export const enviarResumenSemanal = async (to, nombre, datos, idioma = 'es') => {
    const plantilla = await cargarPlantilla(idioma, 'resumenSemanal');
    const urlDashboard = `${FRONTEND_URL}/dashboard`;
    const { subject, html } = plantilla({ nombre, datos, urlDashboard });
    await enviar(to, subject, html);
};
