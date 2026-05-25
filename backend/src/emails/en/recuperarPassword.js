import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Reset your password — Horizonte Verde Digital',
    html: plantillaBase('Reset your password', `
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Reset your password
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 12px;font-size:14px;">
            Hello <strong style="color:#111827;">${nombre}</strong>, we received a request to
            reset your account password.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            The link expires in <strong style="color:#111827;">1 hour</strong>. If you did not request
            this change, you can ignore this email.
        </p>
        ${boton('Reset password', url, '#ea580c')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            If you did not make this request, your account remains secure.
        </p>
    `, '#ea580c', 'en'),
});
