import { plantillaBase } from '../base.js';

export default ({ nombre }) => ({
    subject: 'Your account has been suspended — Horizonte Verde Digital',
    html: plantillaBase('Account suspended', `
        <p style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;
                  padding:3px 10px;border-radius:4px;border:1px solid #fecaca;margin:0 0 20px;letter-spacing:0.5px;">
            ACCESS SUSPENDED
        </p>
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Your account has been suspended
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 16px;font-size:14px;">
            Hello <strong style="color:#111827;">${nombre}</strong>, your access to Horizonte Verde Digital
            has been temporarily suspended by an administrator.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0;font-size:14px;">
            If you believe this is an error or need more information, please contact the platform
            administrator.
        </p>
    `, '#dc2626', 'en'),
});
