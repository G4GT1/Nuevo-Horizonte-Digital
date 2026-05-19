import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Reset your password — Horizonte Verde Digital',
    html: plantillaBase('Reset your password', `
        <h2 style="color:#f1f5f9;margin-top:0;">Password reset</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Hello <strong style="color:#e2e8f0;">${nombre}</strong>, we received a request to
            reset your password. The link expires in <strong style="color:#e2e8f0;">1 hour</strong>.
        </p>
        ${boton('Reset password', url)}
        <p style="color:#64748b;font-size:13px;">If you did not request this change, please ignore this email.</p>
    `, 'en')
});
