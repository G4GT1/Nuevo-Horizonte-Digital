import { plantillaBase, boton } from '../base.js';

const rolesTexto = { superadmin: 'SuperAdmin', tecnico: 'Técnico', alumnado: 'Alumnado' };

export default ({ nombreAdmin, role, url }) => ({
    subject: 'Invitación a Horizonte Verde Digital',
    html: plantillaBase('Has sido invitado', `
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Tienes una nueva invitación
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 12px;font-size:14px;">
            <strong style="color:#111827;">${nombreAdmin}</strong> te ha invitado a unirte a
            <strong style="color:#111827;">Horizonte Verde Digital</strong>, la plataforma de monitorización agrícola.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            Tu rol asignado es <strong style="color:#2563eb;">${rolesTexto[role] ?? role}</strong>.
            El enlace de invitación expira en <strong style="color:#111827;">72 horas</strong>.
        </p>
        ${boton('Aceptar invitación', url, '#2563eb')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            Si no esperabas esta invitación, puedes ignorar este email.
        </p>
    `, '#2563eb', 'es'),
});
