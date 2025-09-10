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

class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private model = 'llama-3.1-8b-instant'; // Modelo Llama 3.1 8B da Groq
  private ragService: import('./ragService').default | null = null; // Lazy loading do RAG

  constructor() {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('VITE_GROQ_API_KEY não encontrada nas variáveis de ambiente');
    }
  }

  /**
   * Inicializa o serviço RAG se necessário
   */
  private async initializeRAG(websiteUrl?: string): Promise<void> {
    if (this.ragService) {
      return;
    }
    
    try {
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
      
      if (!ragConfig.websiteUrl) {
        console.warn('URL do site não configurada para RAG. Configure VITE_RAG_WEBSITE_URL no .env');
        return;
      }
      
      this.ragService = new RAGService(ragConfig);
      await this.ragService.initialize();
      
      console.log('RAG Service inicializado');
    } catch (error) {
      console.error('Erro ao inicializar RAG:', error);
      this.ragService = null;
    }
  }

  /**
   * Envia uma mensagem para a API da Groq
   */
  async sendMessage(
    message: string,
    conversationHistory: GroqMessage[] = [],
    options: RAGOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key da Groq não configurada');
    }

    try {
      // Inicializar RAG se solicitado
       const contextualContent = message;
       let systemPrompt = 'Você é o Oráculo, um assistente inteligente e sábio. Responda de forma clara, precisa e útil.';
       
       if (options.useRAG !== false) { // RAG habilitado por padrão
         await this.initializeRAG(options.websiteUrl);
         
         if (this.ragService) {
           try {
             // Forçar refresh se solicitado
             if (options.forceRefresh) {
               await this.ragService.indexWebsite();
             }
             
             // Buscar contexto relevante
             const ragContext = await this.ragService.searchContext(message);
             
             if (ragContext && ragContext.relevantContent.length > 0) {
               const formattedContext = this.ragService.formatContextForLLM(ragContext);
               
               systemPrompt = `Você é o Oráculo, um assistente inteligente especializado no conteúdo do site, dados internos de funcionários, relatórios, comunicados internos e atendimento ao cliente. Use as informações do contexto fornecido para responder de forma precisa e útil.

CONTEXTO RELEVANTE:
${formattedContext}

Instruções:
- Use principalmente as informações do contexto, incluindo dados de funcionários, relatórios, comunicados internos, atendimento ao cliente e conteúdo web
- Se a pergunta não puder ser respondida com o contexto, indique isso claramente
- Seja preciso e cite informações específicas quando relevante
- Mantenha um tom profissional e útil`;
             }
           } catch (ragError) {
             console.warn('Erro ao buscar contexto RAG:', ragError);
             // Continua sem RAG em caso de erro
           }
         }
       }

      const messages: GroqMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationHistory,
        {
          role: 'user',
          content: contextualContent
        }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: 4096,
          temperature: 0.7,
          top_p: 0.95,
          stream: false,
          stop: null
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro da API Groq: ${response.status} - ${errorData}`);
      }

      const data: GroqResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Resposta inválida da API Groq');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Erro ao comunicar com Groq:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao comunicar com Groq');
    }
  }

  /**
   * Testa a conexão com a API da Groq
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.sendMessage('Olá, você está funcionando?');
      return true;
    } catch (error) {
      console.error('Teste de conexão falhou:', error);
      return false;
    }
  }

  /**
   * Verifica se a API Key está configurada
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Define um modelo diferente para usar
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Obtém o modelo atual
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Configura o RAG com uma nova URL
   */
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

  /**
   * Verifica se o RAG está disponível
   */
  isRAGAvailable(): boolean {
    return !!this.ragService;
  }

  /**
   * Obtém estatísticas do RAG
   */
  getRAGStats() {
    return this.ragService?.getStats() || null;
  }

  /**
   * Limpa o cache do RAG
   */
  clearRAGCache(): void {
    if (this.ragService) {
      this.ragService.clear();
    }
  }
}

// Instância singleton
const groqService = new GroqService();

export default groqService;
export type { GroqMessage, RAGOptions };