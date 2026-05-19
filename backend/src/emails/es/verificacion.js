import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Verifica tu cuenta — Horizonte Verde Digital',
    html: plantillaBase('Verifica tu cuenta', `
        <h2 style="color:#f1f5f9;margin-top:0;">Hola, ${nombre} 👋</h2>
        <p style="color:#94a3b8;line-height:1.6;">
            Gracias por registrarte en Horizonte Verde Digital. Para activar tu cuenta
            pulsa el botón. El enlace expira en <strong style="color:#e2e8f0;">24 horas</strong>.
        </p>
        ${boton('Verificar mi cuenta', url)}
        <p style="color:#64748b;font-size:13px;">Si no creaste esta cuenta, ignora este email.</p>
    `, 'es')
});
