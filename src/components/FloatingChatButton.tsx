import React, { useState, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, AlertTriangle } from 'lucide-react';
import { ChatMessage } from '../types';
import OpenAIService from '../lib/openai';

const quickSuggestions = [
  "Como posso economizar mais dinheiro?",
  "Qual o melhor investimento para mim?",
  "Como organizar minha previdência?",
  "Devo quitar minhas dívidas primeiro?",
  "Como diversificar meus investimentos?"
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
      className="text-xs leading-relaxed"
      dangerouslySetInnerHTML={{ 
        __html: parseMarkdown(children) 
      }}
    />
  );
};

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Olá! Sou sua assistente financeira IA. Como posso ajudá-lo a melhorar suas finanças hoje?',
      timestamp: new Date().toISOString(),
      suggestions: quickSuggestions.slice(0, 3)
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const openaiService = useRef<OpenAIService | null>(null);

  // Inicializar OpenAI Service
  const initOpenAI = () => {
    if (!openaiService.current) {
      try {
        openaiService.current = new OpenAIService();
        console.log('✅ OpenAI Service inicializado no FloatingChat');
      } catch (err) {
        console.error('❌ Erro ao inicializar OpenAI no FloatingChat:', err);
        setError('Erro ao conectar com IA');
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Inicializar OpenAI se necessário
    if (!openaiService.current) {
      initOpenAI();
    }

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
      let response;
      
      if (openaiService.current) {
        // Tentar usar OpenAI
        response = await openaiService.current.generateFinancialAdvice(content);
      } else {
        throw new Error('OpenAI service não disponível');
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions || quickSuggestions.slice(0, 3)
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Mostrar feedback visual se foi fallback
      if (!response.success) {
        setError('⚠️ Usando respostas locais (OpenAI indisponível)');
      }

    } catch (error) {
      console.error('Erro no chat:', error);
      setError('Erro na IA - usando modo local');
      
      // Fallback com respostas locais melhoradas
      const fallbackResponses = [
        `💰 **Sobre economia doméstica:**

Para economizar no Brasil, recomendo:
• Usar a regra 50/30/20 no orçamento
• Revisar assinaturas desnecessárias
• Negociar contas mensais (energia, internet)
• Comparar preços antes de comprar

🎯 **Dica**: Anote todos os gastos por 30 dias!`,

        `📈 **Sobre investimentos:**

Para começar a investir:
• Quite dívidas caras primeiro
• Forme reserva de emergência
• Comece com Tesouro Direto ou CDB
• Diversifique gradualmente

🚀 **Dica**: R$ 100/mês já faz diferença!`,

        `🏦 **Sobre dívidas:**

Para organizar dívidas:
• Liste todas com juros e valores
• Quite as de maior taxa primeiro
• Negocie no Serasa (descontos até 90%)
• Evite o rotativo do cartão

💡 **Dica**: Sempre há desconto na negociação!`
      ];

      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: randomResponse,
        timestamp: new Date().toISOString(),
        suggestions: quickSuggestions.slice(Math.floor(Math.random() * 2), Math.floor(Math.random() * 2) + 3)
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-80 md:w-96 h-[70vh] sm:h-[500px] bg-white rounded-t-xl sm:rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente IA</h3>
                  <p className="text-xs text-white/80">
                    {isTyping ? 'Digitando...' : 'Online agora'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <p className="text-xs text-orange-700">{error}</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-1 sm:space-x-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse sm:space-x-reverse' : ''}`}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-600' 
                      : 'bg-blue-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                    ) : (
                      <Bot className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                    )}
                  </div>
                  
                  <div className={`rounded-2xl p-2 sm:p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    {message.type === 'ai' ? (
                      <MarkdownText>{message.content}</MarkdownText>
                    ) : (
                      <div className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</div>
                    )}
                    <p className={`text-[10px] sm:text-xs mt-1 ${
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
            {messages.length > 0 && messages[messages.length - 1].type === 'ai' && messages[messages.length - 1].suggestions && (
              <div className="flex flex-wrap gap-1 mt-1 sm:mt-2">
                {messages[messages.length - 1].suggestions!.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-all duration-200 border border-blue-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start mt-1">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                  </div>
                                      <div className="bg-gray-50 rounded-2xl p-2 sm:p-3 border border-gray-200">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-0.5 sm:space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-[10px] text-gray-500 ml-1">IA pensando...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2 sm:p-4 border-t border-gray-100">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage(inputValue)}
                placeholder="Digite sua pergunta sobre finanças..."
                className="flex-1 p-1.5 sm:p-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-200 bg-white"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
            
            {/* Quick suggestions */}
            {messages.length === 1 && !inputValue && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] text-gray-500 w-full mb-1">Sugestões rápidas:</span>
                {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-[10px] px-2 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}