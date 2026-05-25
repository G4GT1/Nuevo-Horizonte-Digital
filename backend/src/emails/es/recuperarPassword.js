import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Restablece tu contraseña — Horizonte Verde Digital',
    html: plantillaBase('Restablece tu contraseña', `
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Restablecer contraseña
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 12px;font-size:14px;">
            Hola <strong style="color:#111827;">${nombre}</strong>, recibimos una solicitud para
            restablecer la contraseña de tu cuenta.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            El enlace expira en <strong style="color:#111827;">1 hora</strong>. Si no solicitaste
            este cambio, puedes ignorar este email.
        </p>
        ${boton('Restablecer contraseña', url, '#ea580c')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            Si no realizaste esta solicitud, tu cuenta sigue segura.
        </p>
    `, '#ea580c', 'es'),
});
