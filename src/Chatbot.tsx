import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'bot',
    content: "Hi! I'm your FinanceIQ Assistant. How can I help you today?"
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userText = inputValue;
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userText }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from chat API: ${response.statusText}`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.response || "No response." }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 sm:w-96 h-[500px] flex flex-col bg-[#0B1D3A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-sm tracking-wide">Finance<span className="text-orange-500">IQ</span> Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-orange-500 text-white rounded-br-sm' 
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="max-w-[80%] rounded-2xl p-3 bg-white/5 border border-white/10 text-slate-400 rounded-bl-sm flex items-center gap-1.5 h-10 shadow-md">
                   <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
                   <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                   <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/5 bg-[#08152B]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a basic finance question..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-400 transition-colors shadow-lg"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl shadow-orange-500/20 flex items-center justify-center text-white hover:scale-105 transition-transform group"
        >
          <MessageCircle className="w-6 h-6 group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
}
