const FOOTER_TEXT = {
    es: 'Este email fue generado automáticamente. No respondas a este mensaje.',
    en: 'This email was generated automatically. Please do not reply.',
};

const LOGO_SVG = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       style="display:inline-block;vertical-align:middle;margin-right:8px;">
    <path d="M17 8C8 10 5.9 16.17 3.82 22c2.53-1.8 5.13-3.6 8.18-4.78C14 15 16 12 17 8z"
          fill="ACCENT_COLOR" opacity="0.85"/>
    <path d="M17 8c0 0-2 7-6 10.22C14.09 17.05 18.35 14 21 8"
          fill="ACCENT_COLOR" opacity="0.4"/>
  </svg>`;

export const plantillaBase = (titulo, contenido, accentColor = '#16a34a', lang = 'es') => {
    const logoSvg = LOGO_SVG.replace(/ACCENT_COLOR/g, accentColor);
    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Top accent bar -->
          <tr>
            <td style="background:${accentColor};height:4px;border-radius:4px 4px 0 0;font-size:1px;line-height:1px;">&zwnj;</td>
          </tr>

          <!-- Logo header -->
          <tr>
            <td style="background:#ffffff;padding:24px 40px 20px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <div>
                ${logoSvg}
                <span style="font-size:15px;font-weight:700;color:#111827;letter-spacing:-0.2px;vertical-align:middle;">Horizonte Verde Digital</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${contenido}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 4px 4px;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Horizonte Verde Digital &middot; ${new Date().getFullYear()}
              </p>
              <p style="margin:6px 0 0;color:#d1d5db;font-size:11px;">
                ${FOOTER_TEXT[lang] ?? FOOTER_TEXT.es}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const boton = (texto, url, color = '#16a34a') =>
    `<div style="text-align:center;margin:36px 0 28px;">
      <a href="${url}"
         style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;
                padding:13px 32px;border-radius:8px;font-weight:600;font-size:14px;
                letter-spacing:0.1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        ${texto}
      </a>
    </div>`;

export const infoBox = (filas, accentColor = '#16a34a') => `
  <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;margin:24px 0;border:1px solid #e5e7eb;">
    ${filas.map(([label, value, highlight], i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'};">
        <td style="color:#6b7280;padding:11px 16px;font-size:13px;width:44%;border-bottom:1px solid #f3f4f6;">${label}</td>
        <td style="color:${highlight ? accentColor : '#111827'};padding:11px 16px;font-size:13px;font-weight:${highlight ? '700' : '600'};border-bottom:1px solid #f3f4f6;">${value}</td>
      </tr>`).join('')}
  </table>`;
