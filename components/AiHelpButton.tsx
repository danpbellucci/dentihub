
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, HelpCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useLocation } from 'react-router-dom';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const AiHelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Olá! Sou a IA do DentiHub. Como posso te ajudar a usar o sistema hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Segurança: Garante que o botão SÓ apareça se a rota começar com /dashboard ou /super-admin
  const isAllowedPath = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/super-admin');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Se não estiver em rota permitida, não renderiza nada
  if (!isAllowedPath) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    const newHistory = [...messages, { role: 'user', content: userMsg } as Message];
    
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai-help', {
        body: { 
          history: messages.slice(-6), 
          message: userMsg 
        }
      });

      if (error) throw error;

      if (data && data.reply) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        throw new Error("Resposta vazia da IA");
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Desculpe, tive um problema de conexão. Verifique sua internet ou tente novamente mais tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
          isOpen ? 'bg-red-500 rotate-90' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-110 animate-bounce-slow'
        } text-white`}
        title="Ajuda com IA"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
          style={{ height: '500px', maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <HelpCircle size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">DentiHub Assistant</h3>
              <p className="text-xs text-blue-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950/50 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-gray-800 text-gray-200 border border-white/10 rounded-tl-none'
                  }`}
                >
                  {msg.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-tl-none p-3 border border-white/10 flex items-center gap-2">
                  <Loader2 className="animate-spin text-purple-400" size={16} />
                  <span className="text-xs text-gray-400">Digitando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 bg-gray-900 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || loading}
              className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiHelpButton;
