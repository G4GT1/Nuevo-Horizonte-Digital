import { plantillaBase, boton } from '../base.js';

const rolesTexto = { superadmin: 'SuperAdmin', tecnico: 'Técnico', alumnado: 'Alumnado' };

export default ({ nombreAdmin, role, url }) => ({
    subject: 'Invitación a Horizonte Verde Digital',
    html: plantillaBase('Has sido invitado', `
        <h2 style="color:#f1f5f9;margin-top:0;">Has sido invitado a la plataforma</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            <strong style="color:#e2e8f0;">${nombreAdmin}</strong> te ha invitado con el rol de
            <strong style="color:#16a34a;">${rolesTexto[role] ?? role}</strong>.
            Solo tienes que crear tu contraseña para entrar.
        </p>
        <p style="color:#94a3b8;line-height:1.6;">
            El enlace expira en <strong style="color:#e2e8f0;">72 horas</strong>.
        </p>
        ${boton('Aceptar invitación', url)}
        <p style="color:#64748b;font-size:13px;">Si no esperabas esta invitación, ignora este email.</p>
    `, 'es')
});
