import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle, Loader2, Zap } from 'lucide-react';
import OpenAIService from '../lib/openai';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

const quickSuggestions = [
  "Como posso economizar mais dinheiro?",
  "Qual o melhor investimento para iniciantes?",
  "Como organizar minha previdência?",
  "Devo quitar minhas dívidas primeiro?",
  "Como diversificar meus investimentos?",
  "Analise minha situação financeira",
  "Sugestões para aumentar minha renda",
  "Como criar uma reserva de emergência?"
];

// Função para processar markdown simples
const parseMarkdown = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **texto** -> <strong>texto</strong>
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // *texto* -> <em>texto</em>
    .replace(/•/g, '•') // Manter bullets
    .replace(/\n/g, '<br/>'); // Quebras de linha
};

// Componente para renderizar texto com markdown
const MarkdownText = ({ children }: { children: string }) => {
  return (
    <div 
      className="text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ 
        __html: parseMarkdown(children) 
      }}
    />
  );
};

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: `Olá! 👋 Sou sua assistente financeira IA especializada no mercado brasileiro.

Posso ajudar você com:
💰 **Orçamento e economia**
📈 **Investimentos (CDB, Tesouro, Ações)**
🏦 **Dívidas e renegociação**
🎯 **Planejamento financeiro**

Como posso ajudar suas finanças hoje?`,
      timestamp: new Date().toISOString(),
      suggestions: quickSuggestions.slice(0, 3)
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const openaiService = useRef<OpenAIService | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Debug das variáveis de ambiente
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const debugMsg = `
🔍 DEBUG INFO:
- API Key exists: ${!!apiKey}
- API Key length: ${apiKey?.length || 0}
- API Key preview: ${apiKey ? apiKey.substring(0, 7) + '...' : 'N/A'}
- Env mode: ${import.meta.env.MODE}
- All env keys: ${Object.keys(import.meta.env).join(', ')}
    `;
    
    setDebugInfo(debugMsg);
    
    if (!apiKey) {
      setError('❌ VITE_OPENAI_API_KEY não encontrada no .env');
    } else {
      try {
        openaiService.current = new OpenAIService();
        setError('✅ OpenAI Service inicializado com sucesso');
      } catch (err) {
        setError(`❌ Erro ao inicializar OpenAI: ${err}`);
      }
    }
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setError('');

    try {
      if (!openaiService.current) {
        throw new Error('OpenAI service não inicializado');
      }

      // Mostrar debug antes da chamada
      setError('🔄 Enviando para OpenAI...');
      
      // Gerar resposta usando OpenAI
      const response = await openaiService.current.generateFinancialAdvice(content, {
        conversationHistory: messages.slice(-5) // Últimas 5 mensagens para contexto
      });

      setError(`📡 Resposta recebida: ${response.success ? 'Sucesso' : 'Fallback'}`);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`❌ Erro: ${errorMsg}`);
      
      // Fallback para resposta padrão
      const fallbackResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Desculpe, estou tendo problemas técnicos. Pode reformular sua pergunta?',
        timestamp: new Date().toISOString(),
        suggestions: quickSuggestions.slice(0, 3)
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleAnalyzeFinances = async () => {
    const analysisPrompt = "Analise minha situação financeira atual e me dê sugestões personalizadas para melhorar minha gestão financeira";
    await handleSendMessage(analysisPrompt);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Assistente Financeira IA</h2>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              error ? 'bg-red-500' : 'bg-green-500'
            }`} title={error || 'Conectado'} />
            <button
              onClick={handleAnalyzeFinances}
              disabled={isTyping}
              className="p-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 disabled:opacity-50 transition-all duration-200"
              title="Análise Financeira Rápida"
            >
              <Zap className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <details>
            <summary className="text-sm font-medium text-blue-800 cursor-pointer">
              🔍 Debug Info (Clique para expandir)
            </summary>
            <pre className="text-xs text-blue-700 mt-2 whitespace-pre-wrap">{debugInfo}</pre>
          </details>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              
              <div className={`rounded-2xl p-4 ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-gray-50 text-gray-800 border border-gray-200'
              }`}>
                {message.type === 'ai' ? (
                  <MarkdownText>{message.content}</MarkdownText>
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                )}
                <p className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Suggestions */}
        {messages.length > 0 && messages[messages.length - 1].type === 'ai' && messages[messages.length - 1].suggestions && messages[messages.length - 1].suggestions!.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {messages[messages.length - 1].suggestions!.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full hover:from-indigo-100 hover:to-purple-100 transition-all duration-200 border border-indigo-200 hover:border-indigo-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">Analisando com IA...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta sobre finanças..."
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors duration-200"
            disabled={isTyping}
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Quick suggestions when starting */}
        {!inputValue && messages.length === 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickSuggestions.slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full hover:from-gray-200 hover:to-gray-300 transition-all duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}