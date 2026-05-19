import { plantillaBase, boton } from '../base.js';

const rolesText = { superadmin: 'Super Admin', tecnico: 'Technician', alumnado: 'Student' };

export default ({ nombreAdmin, role, url }) => ({
    subject: 'Invitation to Horizonte Verde Digital',
    html: plantillaBase('You have been invited', `
        <h2 style="color:#f1f5f9;margin-top:0;">You have been invited to the platform</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            <strong style="color:#e2e8f0;">${nombreAdmin}</strong> has invited you with the role of
            <strong style="color:#16a34a;">${rolesText[role] ?? role}</strong>.
            Just create your password to get started.
        </p>
        <p style="color:#94a3b8;line-height:1.6;">
            The link expires in <strong style="color:#e2e8f0;">72 hours</strong>.
        </p>
        ${boton('Accept invitation', url)}
        <p style="color:#64748b;font-size:13px;">If you were not expecting this invitation, please ignore this email.</p>
    `, 'en')
});
