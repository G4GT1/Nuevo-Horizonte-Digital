import { plantillaBase } from '../base.js';

export default ({ nombre }) => ({
    subject: 'Tu cuenta ha sido suspendida — Horizonte Verde Digital',
    html: plantillaBase('Cuenta suspendida', `
        <h2 style="color:#f87171;margin-top:0;">Tu cuenta ha sido suspendida</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Hola <strong style="color:#e2e8f0;">${nombre}</strong>, tu acceso a Horizonte Verde Digital
            ha sido suspendido por un administrador.
        </p>
        <p style="color:#94a3b8;line-height:1.6;">
            Para más información contacta con el administrador de la plataforma.
        </p>
    `, 'es')
});
