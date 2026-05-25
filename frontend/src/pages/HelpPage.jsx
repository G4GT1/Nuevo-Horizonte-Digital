import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, LayoutDashboard, Radio, Bell, FileText, Bot,
  Users, ShieldCheck, ChevronDown, Send, Loader2,
  CheckCircle2, AlertCircle, Ticket,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { aiApi } from '@/api/ai';

// ── Content data ──────────────────────────────────────────────────────────────

const GUIDE_ALL = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Vista general con mapa interactivo de todas las estaciones, KPIs clave y alertas recientes.',
    detail: 'Los iconos azules son estaciones FieldClimate y los verdes son Cesens. Haz clic en cualquiera para ir al detalle.',
  },
  {
    icon: Radio,
    title: 'Estaciones',
    desc: 'Explora las estaciones disponibles (FieldClimate y Cesens) con sus datos actuales.',
    detail: 'Desde el detalle de cada estación puedes seleccionar un rango de fechas y visualizar el histórico de cualquier métrica en gráficas interactivas.',
  },
  {
    icon: Bot,
    title: 'Asistente IA',
    desc: 'Chat con inteligencia artificial conectado a datos reales de los sensores.',
    detail: 'Puedes preguntar por valores actuales, tendencias, recomendaciones de riego o cualquier análisis agronómico. El asistente actualiza el contexto cada 5 minutos.',
  },
  {
    icon: Bell,
    title: 'Notificaciones',
    desc: 'Centro de notificaciones del sistema. Gestiona y marca como leídas.',
    detail: 'Recibes notificaciones cuando se activan alertas críticas o hay actualizaciones del sistema.',
  },
];

const GUIDE_TECNICO = [
  {
    icon: Bell,
    title: 'Alertas',
    desc: 'Configura umbrales de alerta por estación y métrica. Visualiza y resuelve alertas activas.',
    detail: 'Define condiciones (mayor que, menor que, igual a) y un valor umbral. Cuando el sensor supere esa condición se generará una alerta automáticamente.',
  },
  {
    icon: FileText,
    title: 'Informes',
    desc: 'Genera y exporta informes de datos de sensores en PDF o Excel.',
    detail: 'Selecciona la estación, el rango de fechas y el formato. El informe se descarga automáticamente con las métricas de ese periodo.',
  },
];

const GUIDE_ADMIN = [
  ...GUIDE_TECNICO,
  {
    icon: ShieldCheck,
    title: 'Administración',
    desc: 'Panel completo de usuarios: crea, edita, suspende y cambia roles. Envía invitaciones.',
    detail: 'Accede a Usuarios, Invitaciones y Registro de Actividad. Las invitaciones se envían por email con un enlace de registro de 24h.',
  },
];

const FAQS = {
  alumnado: [
    { q: '¿Cómo veo los datos de una estación?', a: 'Ve a "Estaciones" en el menú lateral. Haz clic en cualquier tarjeta para ver los datos actuales. Selecciona un rango de fechas para ver el histórico.' },
    { q: '¿Qué significa cada métrica de los sensores?', a: 'Las métricas más comunes son: temperatura (°C), humedad relativa (%), humedad del suelo (%), lluvia (mm) y radiación solar (W/m²). El Asistente IA puede explicarte cualquier métrica con más detalle.' },
    { q: '¿Cómo uso el Asistente IA?', a: 'Ve a "Asistente IA" y escribe tu pregunta en el chat. Usa las sugerencias rápidas para empezar. El asistente tiene acceso a los datos reales de las estaciones.' },
    { q: '¿Cómo gestiono mis notificaciones?', a: 'En "Notificaciones" puedes ver todas las alertas del sistema. Usa "Marcar todas como leídas" para limpiar la bandeja.' },
    { q: '¿Puedo cambiar el idioma o el tema?', a: 'Sí. En "Perfil" (clic en tu avatar o en el menú) encontrarás las banderas para cambiar entre ES/EN y el botón de modo oscuro/claro.' },
  ],
  tecnico: [
    { q: '¿Cómo configuro una alerta de umbral?', a: 'Ve a "Alertas" → sección "Configurar umbrales". Selecciona la estación, la métrica, el operador (>, <, =) y el valor umbral. Guarda y la alerta se activará automáticamente.' },
    { q: '¿Cómo exporto un informe en PDF?', a: 'Ve a "Informes", selecciona la estación, el formato PDF y el rango de fechas. Haz clic en "Generar informe" y se descargará automáticamente.' },
    { q: '¿Puedo gestionar usuarios alumnado?', a: 'Sí. En "Administración → Usuarios" verás solo los usuarios con rol Alumnado. Puedes editar su información y eliminar cuentas.' },
    { q: '¿Cómo veo el histórico de una estación?', a: 'En el detalle de la estación, usa el selector de fechas ("Desde" / "Hasta") y pulsa "Cargar histórico". Los datos se muestran en gráficas interactivas por métrica.' },
    { q: '¿Qué hacer si una estación aparece offline?', a: 'Indica que el sensor no ha enviado datos recientemente. Verifica la conexión física o el estado de la batería. Puedes preguntar al Asistente IA para análisis adicional.' },
  ],
  superadmin: [
    { q: '¿Cómo invito a un nuevo usuario?', a: 'Ve a "Administración → Invitaciones". Escribe el email del usuario, selecciona el rol y pulsa "Enviar invitación". Recibirá un email con enlace de registro válido 24h.' },
    { q: '¿Cómo cambio el rol de un usuario?', a: 'En "Administración → Usuarios", busca el usuario y haz clic en el icono de cambio de rol (🔧). Selecciona el nuevo rol y confirma.' },
    { q: '¿Cómo suspendo una cuenta?', a: 'En la tabla de usuarios, haz clic en el icono de suspensión junto al usuario. La cuenta queda bloqueada hasta que la reactives con el botón de reactivación.' },
    { q: '¿Cómo veo el registro de actividad?', a: 'En "Administración → Actividad" encontrarás el log completo: logins, cambios de rol, invitaciones enviadas y más.' },
    { q: '¿Cómo elimino una invitación pendiente?', a: 'En "Administración → Invitaciones", haz clic en el icono de papelera junto a la invitación y confirma la eliminación.' },
  ],
};

// ── Sub-components ────────────────────────────────────────────────────────────

function GuideCard({ icon: Icon, title, desc, detail }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => setExpanded((p) => !p)}
      className="card p-4 cursor-pointer hover:border-primary/30 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-text text-sm">{title}</p>
          <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{desc}</p>
          <AnimatePresence>
            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-text-subtle text-xs mt-2 leading-relaxed border-t border-border pt-2"
              >
                {detail}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <ChevronDown
          size={14}
          className={`text-text-subtle shrink-0 transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>
    </motion.div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 py-3.5 text-left hover:text-primary transition-colors"
      >
        <span className="text-text text-sm font-medium">{q}</span>
        <ChevronDown
          size={15}
          className={`text-text-subtle shrink-0 transition-transform ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-text-muted text-sm pb-3.5 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const role = user?.role ?? 'alumnado';

  const [ticketMsg, setTicketMsg] = useState(null);
  const [form, setForm] = useState({ asunto: '', descripcion: '', urgencia: 'media' });

  const guide = role === 'superadmin'
    ? [...GUIDE_ALL, ...GUIDE_ADMIN]
    : role === 'tecnico'
    ? [...GUIDE_ALL, ...GUIDE_TECNICO]
    : GUIDE_ALL;

  const faqs = FAQS[role] ?? FAQS.alumnado;

  const ticketMut = useMutation({
    mutationFn: () => aiApi.sendTicket(form),
    onSuccess: () => {
      setTicketMsg('ok');
      setForm({ asunto: '', descripcion: '', urgencia: 'media' });
      setTimeout(() => setTicketMsg(null), 5000);
    },
    onError: () => {
      setTicketMsg('error');
      setTimeout(() => setTicketMsg(null), 5000);
    },
  });

  const handleTicket = (e) => {
    e.preventDefault();
    if (!form.asunto.trim() || !form.descripcion.trim()) return;
    ticketMut.mutate();
  };

  const canTicket = role === 'superadmin' || role === 'tecnico';

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <HelpCircle size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-text text-xl">{t('help.title')}</h1>
            <p className="text-text-muted text-sm mt-0.5">{t('help.subtitle')}</p>
          </div>
        </div>
      </motion.div>

      {/* Guide */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="font-heading font-semibold text-text text-sm mb-3 flex items-center gap-2">
          <LayoutDashboard size={14} className="text-primary" />
          {t('help.guideTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guide.map((item) => (
            <GuideCard key={item.title} {...item} />
          ))}
        </div>
      </motion.div>

      {/* FAQs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <h2 className="font-heading font-semibold text-text text-sm mb-4 flex items-center gap-2">
          <HelpCircle size={14} className="text-primary" />
          {t('help.faqTitle')}
        </h2>
        {faqs.map((item) => (
          <FaqItem key={item.q} {...item} />
        ))}
      </motion.div>

      {/* Ticket — tecnico + superadmin only */}
      {canTicket && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
          <h2 className="font-heading font-semibold text-text text-sm mb-1 flex items-center gap-2">
            <Ticket size={14} className="text-primary" />
            {t('help.ticketTitle')}
          </h2>
          <p className="text-text-muted text-xs mb-4">{t('help.ticketDesc')}</p>

          <AnimatePresence>
            {ticketMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm mb-4 ${
                  ticketMsg === 'ok'
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-danger/10 border-danger/30 text-danger'
                }`}
              >
                {ticketMsg === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {ticketMsg === 'ok' ? t('help.ticketSent') : t('help.ticketError')}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleTicket} noValidate className="space-y-3">
            <div>
              <label className="label">{t('help.ticketSubject')}</label>
              <input
                type="text"
                className="input"
                value={form.asunto}
                onChange={(e) => setForm((p) => ({ ...p, asunto: e.target.value }))}
                placeholder="Breve descripción del problema"
                required
              />
            </div>
            <div>
              <label className="label">{t('help.ticketDescription')}</label>
              <textarea
                className="input resize-none"
                rows={4}
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Describe el problema con el mayor detalle posible..."
                required
              />
            </div>
            <div>
              <label className="label">{t('help.ticketUrgency')}</label>
              <div className="flex gap-2 mt-1">
                {[
                  { value: 'baja',  label: t('help.urgencyLow'),    cls: 'border-success/40 bg-success/5 text-success' },
                  { value: 'media', label: t('help.urgencyMedium'), cls: 'border-warn/40 bg-warn/5 text-warn' },
                  { value: 'alta',  label: t('help.urgencyHigh'),   cls: 'border-danger/40 bg-danger/5 text-danger' },
                ].map(({ value, label, cls }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, urgencia: value }))}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      form.urgencia === value ? cls : 'border-border text-text-muted hover:bg-card'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={ticketMut.isPending || !form.asunto.trim() || !form.descripcion.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {ticketMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {t('help.ticketSend')}
            </button>
          </form>
        </motion.div>
      )}

    </div>
  );
}
