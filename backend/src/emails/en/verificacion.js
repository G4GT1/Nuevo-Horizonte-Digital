import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Verify your account — Horizonte Verde Digital',
    html: plantillaBase('Verify your account', `
        <h2 style="color:#f1f5f9;margin-top:0;">Hello, ${nombre} 👋</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Thank you for signing up at Horizonte Verde Digital. To activate your account
            click the button below. The link expires in <strong style="color:#e2e8f0;">24 hours</strong>.
        </p>
        ${boton('Verify my account', url)}
        <p style="color:#64748b;font-size:13px;">If you did not create this account, please ignore this email.</p>
    `, 'en')
});
