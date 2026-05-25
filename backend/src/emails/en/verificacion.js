import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Verify your account — Horizonte Verde Digital',
    html: plantillaBase('Verify your account', `
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Welcome, ${nombre}
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 12px;font-size:14px;">
            Thank you for joining <strong style="color:#111827;">Horizonte Verde Digital</strong>.
            To activate your account and start monitoring your stations, please verify your email address.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            The verification link expires in <strong style="color:#111827;">24 hours</strong>.
        </p>
        ${boton('Verify my account', url, '#16a34a')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            If you did not create an account, you can safely ignore this email.
        </p>
    `, '#16a34a', 'en'),
});
