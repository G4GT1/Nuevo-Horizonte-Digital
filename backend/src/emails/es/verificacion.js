import { plantillaBase, boton } from '../base.js';

export default ({ nombre, url }) => ({
    subject: 'Verifica tu cuenta — Horizonte Verde Digital',
    html: plantillaBase('Verifica tu cuenta', `
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">
            Bienvenido, ${nombre}
        </h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 12px;font-size:14px;">
            Gracias por unirte a <strong style="color:#111827;">Horizonte Verde Digital</strong>.
            Para activar tu cuenta y empezar a monitorizar tus estaciones, verifica tu dirección de email.
        </p>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 0;font-size:14px;">
            El enlace de verificación expira en <strong style="color:#111827;">24 horas</strong>.
        </p>
        ${boton('Verificar mi cuenta', url, '#16a34a')}
        <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;line-height:1.6;">
            Si no creaste ninguna cuenta, puedes ignorar este email.
        </p>
    `, '#16a34a', 'es'),
});
