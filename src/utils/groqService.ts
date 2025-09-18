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

      // Usar RAG se disponível
      if (this.ragService) {
        try {
          console.log('[GroqService] Buscando contexto RAG...');
          
          // Detectar tipo de consulta
          const isEmployeeQuery = this.isEmployeeQuery(userMessage);
          const isAnnouncementQuery = this.isAnnouncementQuery(userMessage);
          
          if (isEmployeeQuery) {
            console.log('[GroqService] Detectada consulta sobre funcionários');
            const employeeResults = await this.ragService.searchInternalDataOnly(userMessage);
            
            if (employeeResults.relevantContent.length > 0) {
              ragContext = this.formatEmployeeContext(employeeResults.relevantContent);
              sources = employeeResults.relevantContent.map(item => ({
                type: 'employee',
                content: item.content,
                similarity: item.similarity,
                metadata: item.metadata
              }));
            }
          } else if (isAnnouncementQuery) {
            console.log('[GroqService] Detectada consulta sobre comunicados');
            const announcementResults = await this.ragService.searchInternalDataOnly(userMessage);
            
            if (announcementResults.relevantContent.length > 0) {
              ragContext = this.formatAnnouncementContext(announcementResults.relevantContent);
              sources = announcementResults.relevantContent.map(item => ({
                type: 'announcement',
                content: item.content,
                similarity: item.similarity,
                metadata: item.metadata
              }));
            }
          } else {
            console.log('[GroqService] Usando busca RAG geral');
            const ragResults = await this.ragService.searchContext(userMessage);
            
            if (ragResults.relevantContent.length > 0) {
              ragContext = this.formatGeneralContext(ragResults.relevantContent);
              sources = ragResults.relevantContent.map(item => ({
                type: item.metadata?.type || 'web',
                content: item.content,
                similarity: item.similarity,
                metadata: item.metadata
              }));
            }
          }
          
          console.log('[GroqService] Contexto RAG encontrado:', {
            contextLength: ragContext.length,
            sourcesCount: sources.length
          });
          
        } catch (ragError) {
          console.error('[GroqService] Erro ao buscar contexto RAG:', ragError);
        }
      }

      const systemPrompt = `Você é o Oráculo, um assistente inteligente da TORP (Tecnologia, Organização, Recursos e Pessoas).
Seja útil, preciso e profissional em suas respostas.

INSTRUÇÕES IMPORTANTES:
- Quando houver contexto interno abaixo (funcionários/comunicados/processos), priorize exclusivamente esse conteúdo para responder.
- Se a informação solicitada não estiver no contexto fornecido, diga claramente que não está disponível nos dados internos.
- Não invente dados sobre funcionários, comunicados ou processos internos.
- Para informações gerais sobre a empresa, use o contexto web quando disponível.

${ragContext ? `CONTEXTO RELEVANTE:\n${ragContext}` : 'Nenhum contexto específico encontrado.'}`;

      const finalMessages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(0, -1), // Histórico sem a última mensagem
        { role: 'user', content: userMessage }
      ];

      console.log('[GroqService] Enviando para Groq:', {
        model: this.model,
        messageCount: finalMessages.length,
        hasRAG: !!ragContext,
        sourcesCount: sources.length
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

  // Métodos auxiliares para detectar tipos de consulta
  private isEmployeeQuery(message: string): boolean {
    const employeeKeywords = [
      'funcionário', 'funcionária', 'funcionarios', 'funcionárias',
      'colaborador', 'colaboradora', 'colaboradores', 'colaboradoras',
      'equipe', 'time', 'staff', 'pessoa', 'pessoas',
      'contato', 'telefone', 'email', 'ramal',
      'departamento', 'setor', 'área', 'cargo', 'função'
    ];
    
    const lowerMessage = message.toLowerCase();
    return employeeKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isAnnouncementQuery(message: string): boolean {
    const announcementKeywords = [
      'comunicado', 'comunicados', 'aviso', 'avisos',
      'notícia', 'notícias', 'informação', 'informações',
      'anúncio', 'anúncios', 'novidade', 'novidades',
      'atualização', 'atualizações'
    ];
    
    const lowerMessage = message.toLowerCase();
    return announcementKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Métodos para formatar contexto
  private formatEmployeeContext(results: any[]): string {
    return results.map(result => {
      const employee = result.metadata?.employee || {};
      return `Funcionário: ${employee.name || 'N/A'}
Cargo: ${employee.position || 'N/A'}
Departamento: ${employee.department || 'N/A'}
Email: ${employee.email || 'N/A'}
Telefone: ${employee.phone || 'N/A'}`;
    }).join('\n\n');
  }

  private formatAnnouncementContext(results: any[]): string {
    return results.map(result => {
      const announcement = result.metadata?.announcement || {};
      return `Comunicado: ${announcement.title || 'N/A'}
Data: ${announcement.date || 'N/A'}
Conteúdo: ${result.content}`;
    }).join('\n\n');
  }

  private formatGeneralContext(results: any[]): string {
    return results.map(result => {
      return `Fonte: ${result.metadata?.url || result.metadata?.source || 'Interno'}
Conteúdo: ${result.content}`;
    }).join('\n\n');
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
  async indexEmployeeData(employees: any[]): Promise<void> {
    if (!this.ragService) {
      throw new Error('RAG Service não inicializado');
    }
    await this.ragService.indexEmployeeData(employees);
  }

  async indexAnnouncements(announcements: any[]): Promise<void> {
    if (!this.ragService) {
      throw new Error('RAG Service não inicializado');
    }
    await this.ragService.indexAnnouncements(announcements);
  }

  async indexWebsite(url: string): Promise<void> {
    if (!this.ragService) {
      throw new Error('RAG Service não inicializado');
    }
    await this.ragService.indexWebsite(url);
  }

  getRagStats() {
    return this.ragService?.getStats() || null;
  }

  clearRagData(): void {
    this.ragService?.clear();
  }
}

// Instância singleton
const groqService = new GroqService();
export default groqService;
export type { GroqMessage };
