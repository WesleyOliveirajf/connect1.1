export interface GroqMessage {
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

export interface GroqServiceResponse {
  content: string;
  sources?: Array<{
    type: string;
    content: string;
    similarity: number;
    metadata: any;
  }>;
}

interface ServiceStatus {
  isConfigured: boolean;
  currentModel: string;
  hasApiKey: boolean;
  ragEnabled: boolean;
  lastError: string | null;
  lastSuccessfulConnection: Date | null;
}

// Importação do serviço de busca de funcionários
import employeeSearchService from './employeeSearchService';

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

  // Método público para inicializar RAG
  async initializeRAG(): Promise<void> {
    if (this.ragService) {
      console.log('[GroqService] RAG já inicializado');
      return;
    }
    
    try {
      console.log('[GroqService] Inicializando RAG Service...');
      const { default: RAGService } = await import('./ragService');
      
      const ragConfig = {
        websiteUrl: import.meta.env.VITE_RAG_WEBSITE_URL || '',
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
      
      this.ragService = new RAGService(ragConfig);
      await this.ragService.initialize();
      this.ragEnabled = true;
      
      console.log('[GroqService] ✅ RAG Service inicializado com sucesso');
    } catch (error) {
      console.error('[GroqService] ❌ Erro ao inicializar RAG:', error);
      this.ragService = null;
      this.ragEnabled = false;
      throw error;
    }
  }

  async sendMessage(
    messages: GroqMessage[]
  ): Promise<GroqServiceResponse> {
    if (!this.apiKey) {
      throw new Error('API Key da Groq não configurada. Verifique suas variáveis de ambiente.');
    }

    try {
      const userMessage = messages[messages.length - 1]?.content || '';
      console.log('[GroqService] Processando mensagem:', userMessage.substring(0, 100) + '...');

      let ragContext = '';
      let sources: Array<{
        type: string;
        content: string;
        similarity: number;
        metadata: any;
      }> = [];

      // Determinar tipo de consulta e usar serviço apropriado
      const isEmployeeQuery = this.isEmployeeRelatedQuery(userMessage);

      if (isEmployeeQuery) {
        // Busca direta de funcionários
        try {
          console.log('[GroqService] 👥 Busca de funcionários');
          const employeeResults = employeeSearchService.searchForChatbot(userMessage);

          if (employeeResults.hasResults) {
            ragContext = this.formatEmployeeContext(employeeResults, userMessage);
            sources = [{
              type: 'employees',
              content: `${employeeResults.employees.length} funcionário(s) encontrado(s)`,
              similarity: 1.0,
              metadata: { type: 'internal', count: employeeResults.employees.length }
            }];
          } else {
            ragContext = `Nenhum funcionário encontrado para "${userMessage}"`;
          }

          console.log('[GroqService] Contexto de funcionários:', {
            hasResults: employeeResults.hasResults,
            count: employeeResults.employees.length
          });
        } catch (error) {
          console.error('[GroqService] Erro na busca de funcionários:', error);
          ragContext = 'Erro ao buscar informações de funcionários.';
        }
      } else if (this.ragService) {
        // Busca web com RAG
        try {
          console.log('[GroqService] 🌐 Buscando contexto web...');
          const ragResults = await this.ragService.searchWebContext(userMessage);

          if (ragResults.relevantContent.length > 0) {
            ragContext = this.ragService.formatWebContextForLLM(ragResults);
            sources = ragResults.relevantContent.map(item => ({
              type: 'web',
              content: item.content,
              similarity: item.similarity,
              metadata: { url: item.source, title: item.title }
            }));
          }

          console.log('[GroqService] Contexto web:', {
            contextLength: ragContext.length,
            sourcesCount: sources.length
          });

        } catch (ragError) {
          console.error('[GroqService] Erro ao buscar contexto web:', ragError);
        }
      }

      const systemPrompt = `Você é o Oráculo, assistente inteligente da TORP (Tecnologia, Organização, Recursos e Pessoas).
Seja útil, preciso e profissional.

INSTRUÇÕES:
- Para consultas sobre FUNCIONÁRIOS: use EXCLUSIVAMENTE o contexto fornecido. Não invente dados.
- Para outras consultas: use o contexto web quando disponível.
- Se a informação não estiver no contexto, informe que não está disponível.

${ragContext ? `CONTEXTO RELEVANTE:\n${ragContext}` : 'Nenhum contexto encontrado.'}`;

      const finalMessages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(0, -1), // Histórico sem a última mensagem
        { role: 'user', content: userMessage }
      ];

      console.log('[GroqService] Enviando para Groq:', {
        model: this.model,
        messageCount: finalMessages.length,
        hasContext: !!ragContext,
        sourcesCount: sources.length,
        queryType: isEmployeeQuery ? 'employees' : 'web'
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: finalMessages,
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
            return await this.sendMessage(messages);
          }
        }

        this.lastError = `Erro ${response.status}: ${response.statusText}`;
        throw new Error(`Erro na API da Groq: ${response.status} - ${response.statusText}`);
      }

      const data: GroqResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Resposta inválida da API da Groq');
      }

      const content = data.choices[0].message.content;
      this.lastSuccessfulConnection = new Date();
      this.lastError = null;

      console.log('[GroqService] ✅ Resposta recebida com sucesso');

      return {
        content,
        sources: sources.length > 0 ? sources : undefined
      };

    } catch (error) {
      console.error('[GroqService] ❌ Erro ao enviar mensagem:', error);
      this.lastError = error instanceof Error ? error.message : 'Erro desconhecido';
      throw error;
    }
  }


  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[GroqService] API Key não configurada');
      return false;
    }

    try {
      console.log('[GroqService] Testando conexão...');
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'teste' }],
          max_tokens: 1,
          temperature: 0
        }),
      });

      if (response.ok) {
        this.lastSuccessfulConnection = new Date();
        this.lastError = null;
        console.log('[GroqService] ✅ Conexão bem-sucedida');
        return true;
      } else {
        const errorData = await response.text();
        console.error('[GroqService] ❌ Falha na conexão:', response.status, errorData);
        
        if (errorData.includes('model_decommissioned')) {
          return await this.testConnectionWithFallbackModel();
        }
        
        this.lastError = `Erro ${response.status}: ${response.statusText}`;
        return false;
      }
    } catch (error) {
      console.error('[GroqService] ❌ Erro ao testar conexão:', error);
      this.lastError = error instanceof Error ? error.message : 'Erro de conexão';
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
            messages: [{ role: 'user', content: 'teste' }],
            max_tokens: 1,
            temperature: 0
          }),
        });

        if (response.ok) {
          console.log(`[GroqService] ✅ Modelo ${model} funcionando, atualizando configuração`);
          this.model = model;
          this.lastSuccessfulConnection = new Date();
          this.lastError = null;
          return true;
        }
      } catch (error) {
        console.warn(`[GroqService] Modelo ${model} falhou:`, error);
        continue;
      }
    }

    console.error('[GroqService] ❌ Todos os modelos falharam');
    return false;
  }

  getStatus(): ServiceStatus {
    return {
      isConfigured: !!this.apiKey,
      currentModel: this.model,
      hasApiKey: !!this.apiKey,
      ragEnabled: this.ragEnabled,
      lastError: this.lastError,
      lastSuccessfulConnection: this.lastSuccessfulConnection
    };
  }

  // Métodos para gerenciar RAG
  async indexWebsite(forceRefresh = false): Promise<any> {
    if (!this.ragService) {
      throw new Error('RAG Service não inicializado');
    }
    return await this.ragService.indexWebsite(forceRefresh);
  }

  getRagStats() {
    return this.ragService?.getStats() || null;
  }

  clearRagData(): void {
    this.ragService?.clear();
  }

  /**
   * Detecta se a consulta é sobre funcionários
   */
  private isEmployeeRelatedQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const employeeKeywords = [
      // Nomes e identificação
      'funcionário', 'funcionarios', 'funcionária', 'funcionárias',
      'colaborador', 'colaboradora', 'colaboradores',
      'pessoa', 'pessoas', 'quem é', 'quem são',

      // Departamentos
      'ti', 'comercial', 'administrativo', 'marketing',
      'gente e gestão', 'rh', 'recursos humanos',
      'controladoria', 'compras', 'prefeitura', 'salas',

      // Contato e informações
      'ramal', 'ramais', 'extensão', 'telefone', 'contato',
      'email', 'e-mail', 'endereco',

      // Horários
      'almoço', 'almoco', 'horário', 'horario', 'hora',

      // Consultas quantitativas
      'quantos funcionários', 'quantas pessoas', 'quantidade',
      'total de funcionários', 'número de pessoas',

      // Consultas específicas
      'trabalha', 'atende', 'responsável', 'encarregado',
      'departamento', 'setor', 'área',

      // Ramais específicos (4 dígitos começando com 4)
      '47', '48' // Padrões comuns dos ramais da TORP
    ];

    // Detecta também ramais no formato 4xxx
    const hasExtensionPattern = /\b4\d{3}\b/.test(lowerMessage);

    return employeeKeywords.some(keyword => lowerMessage.includes(keyword)) || hasExtensionPattern;
  }

  /**
   * Formata contexto de funcionários para o LLM
   */
  private formatEmployeeContext(employeeResults: any, query: string): string {
    const { summary, employees, departmentBreakdown, hasResults } = employeeResults;

    if (!hasResults) {
      return `=== 👥 FUNCIONÁRIOS DA TORP ===\n\n${summary}\n\n❓ Nenhum funcionário encontrado para "${query}"`;
    }

    let context = `=== 👥 FUNCIONÁRIOS DA TORP (${employees.length} encontrados) ===\n\n`;
    context += `📊 ${summary}\n\n`;

    if (departmentBreakdown) {
      context += `${departmentBreakdown}\n\n`;
    }

    // Se é consulta sobre contagem/estatísticas
    const isCountQuery = /quantos?|quantidade|total|número/.test(query.toLowerCase());

    if (!isCountQuery && employees.length <= 5) {
      // Lista detalhada para poucos funcionários
      context += '📋 DETALHES:\n\n';
      employees.forEach((emp: any, index: number) => {
        context += `${index + 1}. **${emp.name}**\n`;
        context += `   Departamento: ${emp.department}\n`;
        context += `   Ramal: ${emp.extension}\n`;
        if (emp.email && emp.email !== 'xxx') {
          context += `   Email: ${emp.email}\n`;
        }
        if (emp.lunchTime) {
          context += `   Horário de Almoço: ${emp.lunchTime}\n`;
        }
        context += '\n';
      });
    }

    context += `🔍 Consulta: "${query}"\n`;
    context += 'ℹ️ INSTRUÇÕES: Responda com base nas informações dos funcionários da TORP. Seja preciso e direto.';

    return context;
  }
}

// Instância singleton
const groqService = new GroqService();
export default groqService;
export type { GroqMessage };
