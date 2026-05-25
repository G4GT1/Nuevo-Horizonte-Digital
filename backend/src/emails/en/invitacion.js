import { plantillaBase, boton } from '../base.js';

const rolesText = { superadmin: 'Super Admin', tecnico: 'Technician', alumnado: 'Student' };

export default ({ nombreAdmin, role, url }) => ({
    subject: 'Invitation to Horizonte Verde Digital',
    html: plantillaBase('You have been invited', `
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            You have a new invitation
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 12px;font-size:14px;">
            <strong style="color:#111827;">${nombreAdmin}</strong> has invited you to join
            <strong style="color:#111827;">Horizonte Verde Digital</strong>, the agricultural monitoring platform.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            Your assigned role is <strong style="color:#2563eb;">${rolesText[role] ?? role}</strong>.
            The invitation link expires in <strong style="color:#111827;">72 hours</strong>.
        </p>
        ${boton('Accept invitation', url, '#2563eb')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            If you were not expecting this invitation, you can safely ignore this email.
        </p>
    `, '#2563eb', 'en'),
});
