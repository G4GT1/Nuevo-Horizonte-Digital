import { plantillaBase } from '../base.js';

export default ({ nombre }) => ({
    subject: 'Tu cuenta ha sido suspendida — Horizonte Verde Digital',
    html: plantillaBase('Cuenta suspendida', `
        <p style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;
                  padding:3px 10px;border-radius:4px;border:1px solid #fecaca;margin:0 0 20px;letter-spacing:0.5px;">
            ACCESO SUSPENDIDO
        </p>
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Tu cuenta ha sido suspendida
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 16px;font-size:14px;">
            Hola <strong style="color:#111827;">${nombre}</strong>, tu acceso a Horizonte Verde Digital
            ha sido suspendido temporalmente por un administrador.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0;font-size:14px;">
            Si crees que esto es un error o necesitas más información, contacta con el administrador
            de la plataforma.
        </p>
    `, '#dc2626', 'es'),
});
