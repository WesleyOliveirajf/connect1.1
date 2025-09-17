interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RAGOptions {
  useRAG?: boolean;
  websiteUrl?: string;
  forceRefresh?: boolean;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ServiceStatus {
  isConfigured: boolean;
  currentModel: string;
  hasApiKey: boolean;
  ragEnabled: boolean;
  lastError: string | null;
  lastSuccessfulConnection: Date | null;
}

class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private model = 'llama-3.1-8b-instant';
  private ragService: import('./ragService').default | null = null;
  private ragEnabled = false;
  private lastError: string | null = null;
  private lastSuccessfulConnection: Date | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('VITE_GROQ_API_KEY não encontrada nas variáveis de ambiente');
    }
  }

  private async initializeRAG(websiteUrl?: string): Promise<void> {
    if (this.ragService) {
      return;
    }
    
    try {
      console.log('[GroqService] Inicializando RAG Service...');
      const { default: RAGService } = await import('./ragService');
      
      const ragConfig = {
        websiteUrl: websiteUrl || import.meta.env.VITE_RAG_WEBSITE_URL || '',
        scrapingOptions: {
          maxPages: parseInt(import.meta.env.VITE_RAG_MAX_PAGES || '20'),
          followLinks: true,
          excludePatterns: ['#', 'javascript:', 'mailto:', 'tel:'],
          timeout: 30000
        },
        searchLimit: parseInt(import.meta.env.VITE_RAG_SEARCH_LIMIT || '5'),
        minSimilarity: parseFloat(import.meta.env.VITE_RAG_MIN_SIMILARITY || '0.1'),
        contextMaxLength: parseInt(import.meta.env.VITE_RAG_CONTEXT_MAX_LENGTH || '2000')
      };
      
      console.log('[GroqService] Configuração do RAG:', ragConfig);
      
      // Sempre inicializa o RAG, mesmo sem URL (para dados internos)
      this.ragService = new RAGService(ragConfig);
      await this.ragService.initialize();
      this.updateRAGStatus();
      
      console.log('[GroqService] ✅ RAG Service inicializado com sucesso');
    } catch (error) {
      console.error('[GroqService] ❌ Erro ao inicializar RAG:', error);
      this.ragService = null;
    }
  }

  async sendMessage(
    message: string,
    conversationHistory: GroqMessage[] = [],
    options: RAGOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key da Groq não configurada. Verifique suas variáveis de ambiente.');
    }

    try {
      console.log('[GroqService] Iniciando sendMessage com opções:', {
        useRAG: options.useRAG,
        websiteUrl: options.websiteUrl,
        hasRagService: !!this.ragService
      });

      if (options.useRAG && !this.ragService) {
        console.log('[GroqService] Inicializando RAG...');
        await this.initializeRAG(options.websiteUrl || '');
      }

      let ragContext = '';
      if (options.useRAG && this.ragService) {
        try {
          console.log('[GroqService] Buscando contexto RAG para mensagem:', message);
          
          const isEmployeeQuery = this.isEmployeeQuery(message);
          console.log('[GroqService] É consulta sobre funcionários?', isEmployeeQuery);
          
          if (isEmployeeQuery) {
            console.log('[GroqService] Detectada consulta sobre funcionários, usando busca específica...');
            const employeeResults = await this.ragService.searchEmployees(message);
            console.log('[GroqService] Resultados da busca de funcionários:', employeeResults);
            
            if (employeeResults.totalCount > 0) {
              ragContext = this.formatEmployeeContext(employeeResults, message);
              console.log('[GroqService] Contexto de funcionários encontrado:', employeeResults.totalCount, 'funcionários');
            } else {
              console.log('[GroqService] Nenhum funcionário encontrado na busca');
            }
          } else {
            console.log('[GroqService] Usando busca RAG geral...');
            const ragResults = await this.ragService.searchContext(message);
            if (ragResults.relevantContent.length > 0) {
              ragContext = `\n\nContexto relevante:\n${ragResults.relevantContent.map(r => r.content).join('\n\n')}`;
              console.log('[GroqService] Contexto RAG geral encontrado:', ragResults.relevantContent.length, 'resultados');
            } else {
              console.log('[GroqService] Nenhum contexto RAG geral encontrado');
            }
          }
        } catch (ragError) {
          console.error('[GroqService] Erro ao buscar contexto RAG:', ragError);
        }
      } else {
        console.log('[GroqService] RAG não será usado:', {
          useRAG: options.useRAG,
          hasRagService: !!this.ragService
        });
      }

      const systemPrompt = `Você é o Oráculo, um assistente inteligente da TORP (Tecnologia, Organização, Recursos e Pessoas).
Seja útil, preciso e profissional em suas respostas.

- Quando houver contexto interno abaixo (funcionários/comunicados/processos), priorize exclusivamente esse conteúdo para responder.
- Se a informação solicitada não estiver no contexto, diga claramente que não está disponível. Não invente dados.
${ragContext}`;

      console.log('[GroqService] 📝 Contexto RAG:', ragContext ? ragContext.substring(0, 200) + '...' : 'VAZIO');
      console.log('[GroqService] 📝 Prompt do sistema:', systemPrompt.substring(0, 300) + '...');

      const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      console.log('[GroqService] Enviando mensagem para Groq...', {
        model: this.model,
        messageCount: messages.length,
        hasRAG: !!ragContext,
        ragContextLength: ragContext.length
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[GroqService] Erro na API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        if (errorData.includes('model_decommissioned') || errorData.includes('decommissioned')) {
          console.warn('[GroqService] Modelo descontinuado, tentando com modelo alternativo...');
          const connectionWorking = await this.testConnectionWithFallbackModel();
          if (connectionWorking) {
            return await this.sendMessage(message, conversationHistory, options);
          }
        }

        if (response.status === 401) {
          throw new Error('API Key inválida ou expirada. Verifique suas credenciais.');
        } else if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (response.status >= 500) {
          throw new Error('Erro interno do servidor Groq. Tente novamente mais tarde.');
        } else {
          throw new Error(`Erro na API Groq: ${response.status} - ${response.statusText}`);
        }
      }

      const data: GroqResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Resposta vazia da API Groq');
      }

      const responseContent = data.choices[0].message.content;
      
      console.log('[GroqService] Resposta recebida:', {
        model: data.model,
        usage: data.usage,
        responseLength: responseContent.length
      });

      return responseContent;

    } catch (error) {
      console.error('[GroqService] Erro ao enviar mensagem:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Erro desconhecido ao comunicar com o Groq');
      }
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[GroqService] API Key não configurada');
      this.lastError = 'API Key não configurada';
      return false;
    }

    try {
      console.log('[GroqService] Testando conexão com Groq...');
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'Teste de conexão - responda apenas "OK"'
            }
          ],
          max_tokens: 10,
          temperature: 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[GroqService] Erro na resposta da API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        this.lastError = `Erro ${response.status}: ${response.statusText}`;
        
        if (errorData.includes('model_decommissioned') || errorData.includes('decommissioned')) {
          console.warn('[GroqService] Modelo descontinuado detectado, tentando com modelo alternativo...');
          return await this.testConnectionWithFallbackModel();
        }
        
        return false;
      }

      const data = await response.json();
      console.log('[GroqService] Conexão bem-sucedida:', {
        model: data.model,
        usage: data.usage
      });
      
      this.lastError = null;
      this.lastSuccessfulConnection = new Date();
      return true;
    } catch (error) {
      console.error('[GroqService] Erro ao testar conexão:', error);
      this.lastError = error instanceof Error ? error.message : 'Erro desconhecido';
      return false;
    }
  }

  private async testConnectionWithFallbackModel(): Promise<boolean> {
    const fallbackModels = [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma-7b-it'
    ];

    for (const model of fallbackModels) {
      try {
        console.log(`[GroqService] Testando modelo alternativo: ${model}`);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: 'Teste de conexão - responda apenas "OK"'
              }
            ],
            max_tokens: 10,
            temperature: 0
          }),
        });

        if (response.ok) {
          console.log(`[GroqService] Modelo alternativo funcionando: ${model}`);
          this.model = model;
          return true;
        }
      } catch (error) {
        console.warn(`[GroqService] Modelo ${model} falhou:`, error);
        continue;
      }
    }

    console.error('[GroqService] Nenhum modelo alternativo funcionou');
    return false;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }

  async configureRAG(websiteUrl: string, forceRefresh: boolean = false): Promise<boolean> {
    try {
      await this.initializeRAG(websiteUrl);
      
      if (this.ragService && forceRefresh) {
        const result = await this.ragService.indexWebsite(true);
        return result.success;
      }
      
      return !!this.ragService;
    } catch (error) {
      console.error('Erro ao configurar RAG:', error);
      return false;
    }
  }

  isRAGAvailable(): boolean {
    return !!this.ragService;
  }

  getRAGStats() {
    return this.ragService?.getStats() || null;
  }

  clearRAGCache(): void {
    if (this.ragService) {
      this.ragService.clear();
    }
  }

  getServiceStatus(): ServiceStatus {
    return {
      isConfigured: this.isConfigured(),
      currentModel: this.model,
      hasApiKey: !!this.apiKey,
      ragEnabled: this.ragEnabled,
      lastError: this.lastError,
      lastSuccessfulConnection: this.lastSuccessfulConnection
    };
  }

  clearLastError(): void {
    this.lastError = null;
  }

  private isEmployeeQuery(message: string): boolean {
    console.log('[GroqService] 🔍 Verificando se é consulta sobre funcionários:', message);
    
    const employeeTerms = [
      // Termos diretos sobre funcionários
      'funcionário', 'funcionarios', 'funcionária', 'funcionárias',
      'colaborador', 'colaboradores', 'colaboradora', 'colaboradoras',
      'pessoa', 'pessoas', 'equipe', 'time', 'staff', 'pessoal',
      
      // Informações de contato
      'ramal', 'ramais', 'extensão', 'extensões', 'telefone',
      'email', 'e-mail', 'contato', 'contatos',
      
      // Departamentos e setores
      'departamento', 'departamentos', 'setor', 'setores',
      'comercial', 'administrativo', 'ti', 'marketing', 'rh',
      'gente e gestão', 'controladoria', 'compras', 'prefeitura',
      
      // Consultas sobre quantidade
      'quantos', 'quantas', 'quantidade', 'total', 'número',
      'conta', 'contar', 'listar', 'lista',
      
      // Consultas sobre localização/identificação
      'quem', 'onde', 'qual', 'como', 'falar', 'encontrar',
      'procurar', 'buscar', 'localizar',
      
      // Horários e informações específicas
      'almoço', 'horário', 'horarios', 'trabalha', 'atende'
    ];
    
    const messageLower = message.toLowerCase();
    console.log('[GroqService] Mensagem em minúsculas:', messageLower);
    
    // Verificar termos diretos
    const matchedTerms = employeeTerms.filter(term => messageLower.includes(term));
    const hasEmployeeTerms = matchedTerms.length > 0;
    console.log('[GroqService] Termos encontrados:', matchedTerms);
    
    // Verificar padrões específicos de consulta
    const patterns = [
      /quem (é|trabalha|atende|cuida)/,
      /quantos?.*(trabalham|estão|há)/,
      /onde (fica|está|encontro)/,
      /como (falo|contato|encontro)/,
      /qual.*(ramal|email|telefone)/,
      /lista.*(funcionários|pessoas|colaboradores)/,
      /pessoal.*(do|da|de)/
    ];
    
    const matchedPatterns = patterns.filter(pattern => pattern.test(messageLower));
    const hasEmployeePatterns = matchedPatterns.length > 0;
    console.log('[GroqService] Padrões encontrados:', matchedPatterns.length);
    
    const isEmployeeQuery = hasEmployeeTerms || hasEmployeePatterns;
    console.log('[GroqService] 🎯 É consulta sobre funcionários?', isEmployeeQuery);
    
    return isEmployeeQuery;
  }

  private formatEmployeeContext(employeeResults: any, originalQuery: string): string {
    const { employees, totalCount, departmentCounts } = employeeResults;
    
    let context = '\n\n=== DADOS DOS FUNCIONÁRIOS DA EMPRESA ===\n';
    
    // Informações de contagem
    context += `\n📊 TOTAL DE FUNCIONÁRIOS: ${totalCount}\n`;
    
    if (Object.keys(departmentCounts).length > 0) {
      context += '\n📋 DISTRIBUIÇÃO POR DEPARTAMENTO:\n';
      Object.entries(departmentCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .forEach(([dept, count]) => {
          context += `   • ${dept}: ${count} funcionário(s)\n`;
        });
    }
    
    if (employees.length > 0) {
      context += '\n👥 DETALHES DOS FUNCIONÁRIOS:\n';
      const limitedEmployees = employees.slice(0, 15);
      
      limitedEmployees.forEach((emp: any, index: number) => {
        context += `\n${index + 1}. ${emp.name}`;
        if (emp.department) context += ` - ${emp.department}`;
        if (emp.extension) context += ` | Ramal: ${emp.extension}`;
        if (emp.email && emp.email !== 'xxx') context += ` | Email: ${emp.email}`;
        if (emp.lunchTime) context += ` | Almoço: ${emp.lunchTime}`;
      });
      
      if (employees.length > 15) {
        context += `\n... e mais ${employees.length - 15} funcionário(s) não listados.`;
      }
    }
    
    // Instruções específicas baseadas na consulta
    context += '\n\n🎯 INSTRUÇÕES PARA RESPOSTA:\n';
    
    const queryLower = originalQuery.toLowerCase();
    if (/quantos?|quantidade|total|número/.test(queryLower)) {
      context += '• FOQUE nos números exatos fornecidos acima\n';
      context += '• Use os dados de contagem por departamento quando relevante\n';
    }
    
    if (/ramal|telefone|contato/.test(queryLower)) {
      context += '• Forneça o ramal completo quando disponível\n';
      context += '• Mencione o departamento para facilitar a localização\n';
    }
    
    if (/email|e-mail/.test(queryLower)) {
      context += '• Forneça o email completo quando disponível (ignore "xxx")\n';
      context += '• Se não houver email, informe que não está disponível\n';
    }
    
    if (/departamento|setor/.test(queryLower)) {
      context += '• Use a distribuição por departamento fornecida acima\n';
      context += '• Liste os funcionários do departamento específico se solicitado\n';
    }
    
    context += '• Seja preciso e use apenas as informações fornecidas\n';
    context += '• Se não souber algo específico, diga que a informação não está disponível\n';
    context += '• Mantenha um tom profissional e útil\n';
    
    return context;
  }

  private updateRAGStatus(): void {
    this.ragEnabled = !!this.ragService;
  }
}

const groqService = new GroqService();

export default groqService;
export type { GroqMessage, RAGOptions, ServiceStatus };
