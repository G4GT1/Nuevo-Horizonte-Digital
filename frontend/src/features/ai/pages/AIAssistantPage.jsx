import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bot, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { aiApi } from '@features/ai/api/ai.api';
import { format } from 'date-fns';

const WELCOME = {
  role: 'assistant',
  content: '¡Hola! Soy el asistente agrícola de Horizonte Verde Digital. Estoy conectado a los datos reales de las estaciones de sensores y puedo ayudarte a interpretar métricas, analizar condiciones ambientales y darte recomendaciones agronómicas.\n\n¿En qué puedo ayudarte hoy?',
  timestamp: new Date(),
};

const QUICK = [
  '¿Cómo están las condiciones actuales de humedad?',
  '¿Hay alguna alerta activa en las estaciones?',
  '¿Cuándo regar según los datos del suelo?',
  '¿Qué métricas debo monitorear para maíz?',
];

/**
 * Pagina de asistente IA con interfaz de chat a pantalla completa.
 * Muestra sugerencias rapidas al inicio; envia los ultimos 10 mensajes como contexto.
 * Permite limpiar la conversacion con el boton de reset.
 * @component
 * @returns {JSX.Element}
 */
export default function AIAssistantPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const content = text ?? input.trim();
    if (!content || loading) return;

    const userMsg = { role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .concat(userMsg)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map(({ role, content: c }) => ({ role, content: c }))
        .slice(-10);

      const { data } = await aiApi.chat(history);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.data.reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.', timestamp: new Date(), error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="shrink-0">
        <h1 className="page-title flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          {t('ai.title')}
        </h1>
        <p className="page-subtitle">Datos reales de sensores · Respuestas agronómicas con IA</p>
      </div>

      {/* Chat */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col card overflow-hidden min-h-0"
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} className="text-primary" />
                </div>
              )}
              <div className={`max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-bg rounded-br-sm'
                    : msg.error
                    ? 'bg-danger/10 border border-danger/20 text-danger rounded-bl-sm'
                    : 'bg-card-hover border border-border text-text rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-text-subtle px-1">
                  {format(new Date(msg.timestamp), 'HH:mm')}
                </span>
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Bot size={13} className="text-primary" />
              </div>
              <div className="bg-card-hover border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-surface border border-border text-text-muted hover:text-primary hover:border-primary/30 rounded-full px-3 py-1.5 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-3 shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={t('ai.placeholder')}
              rows={1}
              className="input resize-none text-sm py-2 flex-1"
              style={{ minHeight: 40, maxHeight: 100 }}
              disabled={loading}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="btn-primary px-3 py-2 shrink-0 self-end">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
            <button onClick={() => setMessages([WELCOME])} className="btn-secondary px-2.5 py-2 shrink-0 self-end" title="Limpiar chat">
              <RotateCcw size={14} />
            </button>
          </div>
          <p className="text-text-subtle text-xs mt-1.5 px-1">Enter para enviar · Shift+Enter nueva línea</p>
        </div>
      </motion.div>
    </div>
  );
}
