class OpenAIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('❌ VITE_OPENAI_API_KEY não encontrada no ambiente');
    }

    if (!this.apiKey.startsWith('sk-') && !this.apiKey.startsWith('sk-proj-')) {
      throw new Error('❌ API Key inválida - deve começar com sk- ou sk-proj-');
    }
  }

  async generateFinancialAdvice(userMessage: string, userContext: any = {}) {
    try {
      const systemPrompt = this.buildSystemPrompt(userContext);
      
      const requestBody = {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API Error ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content || '';
      
      // Verificar se a resposta foi cortada
      const finishReason = data.choices[0]?.finish_reason;
      if (finishReason === 'length') {
        console.warn('⚠️ Resposta cortada por limite de tokens, tentando novamente com prompt mais conciso...');
        
        // Tentar novamente com prompt mais conciso
        const concisePrompt = `Responda de forma concisa e completa sobre: ${userMessage}
        
Contexto: Assistente financeira brasileira
Formato: Use **negrito** e • bullets quando apropriado
Limite: Resposta completa em até 400 palavras`;

        const retryBody = {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: concisePrompt },
            { role: "user", content: userMessage }
          ],
          max_tokens: 600, // Ainda mais tokens na segunda tentativa
          temperature: 0.7,
        };

        const retryResponse = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(retryBody)
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          content = retryData.choices[0]?.message?.content || content;
        }
      }
      
      return {
        success: true,
        content: content,
        suggestions: this.generateSuggestions(userMessage)
      };
    } catch (error) {
      console.error('❌ Erro na API da OpenAI:', error);
      
      return {
        success: false,
        content: this.getFallbackResponse(userMessage),
        suggestions: this.generateSuggestions(userMessage),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private buildSystemPrompt(userContext: any) {
    // Monta contexto detalhado com todos os dados do dashboard
    let contextInfo = '';
    if (userContext) {
      contextInfo += '\nCONTEXTO FINANCEIRO DO USUÁRIO:\n';
      if (userContext.totalMonthlyIncome) contextInfo += `- Renda mensal total: R$ ${userContext.totalMonthlyIncome}\n`;
      if (userContext.totalMonthlyExpenses) contextInfo += `- Gastos mensais totais: R$ ${userContext.totalMonthlyExpenses}\n`;
      if (userContext.netMonthlyIncome) contextInfo += `- Sobra mensal: R$ ${userContext.netMonthlyIncome}\n`;
      if (userContext.totalInvestmentValue) contextInfo += `- Investimentos: R$ ${userContext.totalInvestmentValue} (${userContext.investmentTypes?.join(', ')})\n`;
      if (userContext.totalRealEstateValue) contextInfo += `- Imóveis: R$ ${userContext.totalRealEstateValue} (${userContext.propertyCount} propriedades)\n`;
      if (userContext.totalDebt) contextInfo += `- Dívidas: R$ ${userContext.totalDebt}\n`;
      if (userContext.totalBills) contextInfo += `- Contas fixas: R$ ${userContext.totalBills}\n`;
      if (userContext.totalRetirementSaved) contextInfo += `- Previdência: R$ ${userContext.totalRetirementSaved}\n`;
      if (userContext.totalVehicleValue) contextInfo += `- Veículos: R$ ${userContext.totalVehicleValue}\n`;
      if (userContext.totalExoticValue) contextInfo += `- Ativos exóticos: R$ ${userContext.totalExoticValue}\n`;
      if (userContext.netWorth) contextInfo += `- Patrimônio líquido: R$ ${userContext.netWorth}\n`;
      if (userContext.emergencyFundMonths) contextInfo += `- Reserva de emergência: ${userContext.emergencyFundMonths} meses\n`;
      if (userContext.goalCount) contextInfo += `- Metas financeiras: ${userContext.goalCount} ativa(s), poupado R$ ${userContext.totalGoalsSaved}\n`;
      if (userContext.goals) contextInfo += `- Detalhes das metas: ${JSON.stringify(userContext.goals)}\n`;
      if (userContext.expenseCategories) contextInfo += `- Categorias de gastos: ${userContext.expenseCategories.join(', ')}\n`;
      if (userContext.incomeCategories) contextInfo += `- Categorias de renda: ${userContext.incomeCategories.join(', ')}\n`;
      if (userContext.recentTransactions) contextInfo += `- Transações recentes: ${JSON.stringify(userContext.recentTransactions)}\n`;
    }

    return `
Você é uma assistente financeira especializada em finanças pessoais brasileiras.

SUAS CARACTERÍSTICAS:
🇧🇷 Especialista no mercado financeiro brasileiro
💡 Conhece produtos financeiros nacionais (CDI, Selic, CDB, LCI/LCA, Tesouro Direto)
📊 Entende tributação brasileira (IR, IOF, etc.)
🗣️ Usa linguagem clara e acessível
📱 Dá conselhos práticos e acionáveis

SUAS ESPECIALIDADES:
✅ Orçamento doméstico e controle de gastos
✅ Investimentos (renda fixa, ações, fundos, previdência)
✅ Planejamento para aposentadoria
✅ Estratégias de quitação de dívidas
✅ Formação de reserva de emergência
✅ Educação financeira brasileira

${contextInfo}

INSTRUÇÕES PARA RESPOSTA:
- Máximo 400 palavras (ajustado para respostas completas)
- Use **negrito** para destacar pontos importantes
- Use • para bullet points
- Inclua pelo menos uma dica prática
- Seja específico sobre o contexto brasileiro
- Use emojis moderadamente (no início de seções)
- Evite jargões técnicos excessivos
- Sempre em português brasileiro
- Quebras de linha para organizar o conteúdo
- SEMPRE complete sua resposta - não corte no meio

Responda de forma útil, educativa e bem formatada. IMPORTANTE: Sempre termine sua resposta de forma completa.
`;
  }

  private generateSuggestions(userMessage: string): string[] {
    const lowerMessage = userMessage.toLowerCase();
    
    const suggestionMap: Record<string, string[]> = {
      'economia': [
        "Como fazer orçamento 50/30/20?",
        "Melhores apps para controle financeiro",
        "Dicas para reduzir gastos mensais"
      ],
      'investimento': [
        "CDB vs Tesouro Direto: qual escolher?",
        "Como começar com R$ 100/mês",
        "Melhores corretoras gratuitas"
      ],
      'dívida': [
        "Como renegociar no Serasa?",
        "Método bola de neve funciona?",
        "Feirão de quitação: prós e contras"
      ],
      'aposentadoria': [
        "INSS vs Previdência Privada",
        "Simulador de aposentadoria",
        "Quanto poupar por mês?"
      ],
      'reserva': [
        "Onde investir a reserva de emergência?",
        "Qual valor ideal da reserva?",
        "CDB vs Poupança: qual melhor?"
      ],
      'renda': [
        "Como aumentar renda extra?",
        "Investimentos que pagam mensalmente",
        "Renda passiva para iniciantes"
      ]
    };

    // Detectar categoria
    for (const [category, suggestions] of Object.entries(suggestionMap)) {
      if (lowerMessage.includes(category) || 
          (category === 'investimento' && lowerMessage.includes('investir')) ||
          (category === 'dívida' && lowerMessage.includes('débito')) ||
          (category === 'renda' && lowerMessage.includes('ganhar'))) {
        return suggestions;
      }
    }

    // Sugestões padrão
    return [
      "Como organizar minha vida financeira?",
      "Investimentos para iniciantes",
      "Estratégias de economia doméstica"
    ];
  }

  private getFallbackResponse(userMessage: string): string {
    const fallbackResponses: Record<string, string> = {
      'economia': `💰 **Para economizar no Brasil:**

• **Regra 50/30/20**: 50% necessidades, 30% desejos, 20% investimentos
• **Revise assinaturas**: Netflix, Spotify, academia que não usa
• **Apps úteis**: GuiaBolso, Mobills, Organizze
• **Negocie contas**: energia, internet, celular
• **Compre consciente**: liste antes de ir ao mercado

🎯 **Dica prática**: Anote TODOS os gastos por 30 dias. Você vai se surpreender!`,

      'investimento': `📈 **Primeiros passos para investir:**

• **1º passo**: Quite dívidas caras (cartão, cheque especial)
• **2º passo**: Forme reserva de emergência (6 meses de gastos)
• **3º passo**: Abra conta em corretora (XP, Rico, Clear)
• **4º passo**: Comece com renda fixa (CDB, Tesouro Direto)
• **5º passo**: Estude antes de partir para ações

🚀 **Dica prática**: Comece com R$ 100/mês no Tesouro Selic.`,

      'dívida': `🏦 **Estratégia para quitar dívidas:**

• **Liste tudo**: valores, juros, parcelas restantes
• **Priorize**: cartão rotativo e cheque especial primeiro
• **Negocie**: ligue para bancos, sempre há desconto
• **Use método "avalanche"**: quite maiores juros primeiro
• **Corte gastos**: temporariamente para acelerar quitação

💡 **Dica prática**: Serasa oferece descontos até 90% online.`,

      'default': `🎯 **Vamos organizar suas finanças:**

• **Diagnóstico**: Anote gastos por 30 dias
• **Orçamento**: Use regra 50/30/20
• **Prioridades**: Quite dívidas caras primeiro
• **Reserva**: 6 meses de gastos essenciais
• **Investimentos**: Comece com renda fixa

📊 **Dica prática**: Use planilhas gratuitas do Banco Central.`
    };

    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('economizar') || lowerMessage.includes('economia')) {
      return fallbackResponses.economia;
    } else if (lowerMessage.includes('investir') || lowerMessage.includes('investimento')) {
      return fallbackResponses.investimento;
    } else if (lowerMessage.includes('dívida') || lowerMessage.includes('débito')) {
      return fallbackResponses.dívida;
    } else {
      return fallbackResponses.default;
    }
  }
}

export default OpenAIService;