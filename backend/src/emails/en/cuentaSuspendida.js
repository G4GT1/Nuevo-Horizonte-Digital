import { plantillaBase } from '../base.js';

export default ({ nombre }) => ({
    subject: 'Your account has been suspended — Horizonte Verde Digital',
    html: plantillaBase('Account suspended', `
        <h2 style="color:#f87171;margin-top:0;">Your account has been suspended</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Hello <strong style="color:#e2e8f0;">${nombre}</strong>, your access to Horizonte Verde Digital
            has been suspended by an administrator.
        </p>
        <p style="color:#94a3b8;line-height:1.6;">
            For more information, please contact the platform administrator.
        </p>
    `, 'en')
});
