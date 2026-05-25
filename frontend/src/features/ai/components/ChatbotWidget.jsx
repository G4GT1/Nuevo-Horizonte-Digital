import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '@shared/store/uiStore';
import { aiApi } from '@features/ai/api/ai.api';
import { format } from 'date-fns';

const makeWelcome = (mode, t) => ({
  role: 'assistant',
  content: mode === 'help'
    ? t('help.chatWelcome')
    : '¡Hola! Soy el asistente de Horizonte Verde Digital. Puedo ayudarte con la plataforma, interpretar datos de sensores y darte recomendaciones agronómicas.',
  timestamp: new Date(),
});

/**
 * Widget flotante de chatbot con boton de apertura y panel de conversacion.
 * Soporta dos modos: 'chat' (asistente general) y 'help' (soporte de la pagina de ayuda).
 * Envia hasta los ultimos 10 mensajes como historial de contexto al API.
 * @component
 * @param {Object} props
 * @param {'chat'|'help'} [props.mode='chat'] - Modo de operacion del widget.
 * @returns {JSX.Element}
 */
export default function ChatbotWidget({ mode = 'chat' }) {
  const { t } = useTranslation();
  const { chatbotOpen, toggleChatbot } = useUiStore();
  const [messages, setMessages] = useState(() => [makeWelcome(mode, t)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setMessages([makeWelcome(mode, t)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (chatbotOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatbotOpen, messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .concat(userMsg)
        .map(({ role, content }) => ({ role, content }))
        .slice(-10);

      const apiFn = mode === 'help' ? aiApi.help : aiApi.chat;
      const { data } = await apiFn(history);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.data.reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.', timestamp: new Date(), error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const headerLabel = mode === 'help' ? t('help.chatTitle') : 'Asistente IA';

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChatbot}
        className="fixed bottom-5 right-5 w-12 h-12 rounded-full bg-primary shadow-glow-lg
                   flex items-center justify-center z-50 text-bg hover:bg-primary-light transition-colors"
        aria-label="Toggle assistant"
      >
        <AnimatePresence mode="wait">
          {chatbotOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {chatbotOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 right-5 w-80 h-[480px] card flex flex-col z-50 shadow-glow"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-text text-sm">{headerLabel}</div>
                <div className="text-text-subtle text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  En línea
                </div>
              </div>
              <button onClick={toggleChatbot} className="btn-ghost p-1.5 text-text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-scroll">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-bg rounded-br-sm'
                      : msg.error
                      ? 'bg-danger/10 border border-danger/20 text-danger rounded-bl-sm'
                      : 'bg-card-hover border border-border text-text rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-bg/60' : 'text-text-subtle'}`}>
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card-hover border border-border rounded-xl rounded-bl-sm px-3 py-2.5">
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

            {/* Input */}
            <div className="border-t border-border p-3 shrink-0">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={t('ai.placeholder')}
                  rows={1}
                  className="input resize-none text-xs py-2 flex-1"
                  style={{ minHeight: 36, maxHeight: 80 }}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="btn-primary px-3 py-2 shrink-0 self-end"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
