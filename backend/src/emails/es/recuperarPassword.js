import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Restablece tu contraseña — Horizonte Verde Digital',
    html: plantillaBase('Restablece tu contraseña', `
        <h2 style="color:#f1f5f9;margin-top:0;">Restablecer contraseña</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Hola <strong style="color:#e2e8f0;">${nombre}</strong>, recibimos una solicitud para
            restablecer tu contraseña. El enlace expira en <strong style="color:#e2e8f0;">1 hora</strong>.
        </p>
        ${boton('Restablecer contraseña', url)}
        <p style="color:#64748b;font-size:13px;">Si no solicitaste este cambio, ignora este email.</p>
    `, 'es')
});
