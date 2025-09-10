/**
 * Serviço RAG (Retrieval-Augmented Generation)
 * Integra web scraping, vector store e busca semântica
 */

import ProxyScrapingService, { type ScrapedContent, type ScrapingOptions } from './proxyScrapingService';
import VectorStoreService, { type SearchResult } from './vectorStoreService';
import { VectorDocument } from './vectorStoreService'; // Ajustar se necessário

export interface RAGConfig {
  websiteUrl: string;
  scrapingOptions?: ScrapingOptions;
  searchLimit?: number;
  minSimilarity?: number;
  contextMaxLength?: number;
}

export interface RAGContext {
  query: string;
  relevantContent: {
    content: string;
    source: string;
    title: string;
    similarity: number;
  }[];
  totalSources: number;
  searchTime: number;
}

class RAGService {
  private webScraper: ProxyScrapingService | null = null;
  private vectorStore: VectorStoreService;
  private config: RAGConfig;
  private isInitialized = false;
  private lastScrapingTime: string | null = null;

  constructor(config: RAGConfig) {
    this.config = {
      searchLimit: 5,
      minSimilarity: 0.1,
      contextMaxLength: 2000,
      ...config
    };
    
    this.vectorStore = new VectorStoreService();
    
    if (this.config.websiteUrl) {
      this.webScraper = new ProxyScrapingService(this.config.websiteUrl);
    }
  }

  /**
   * Inicializa o serviço RAG
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    await this.vectorStore.initialize();
    
    // Indexa dados de funcionários
    await this.indexEmployees();
    
    // Verifica se há dados no vector store
    const stats = this.vectorStore.getStats();
    this.lastScrapingTime = stats.lastUpdated;
    
    if (stats.totalDocuments === 0) {
      console.log('Vector store vazio. Será necessário fazer scraping inicial.');
    } else {
      console.log(`RAG inicializado com ${stats.totalDocuments} documentos de ${stats.totalUrls} URLs`);
    }
    
    this.isInitialized = true;
  }

  /**
   * Executa scraping e indexação do site
   */
  async indexWebsite(forceRefresh: boolean = false): Promise<{
    success: boolean;
    documentsIndexed: number;
    error?: string;
  }> {
    try {
      if (!this.webScraper) {
        throw new Error('URL do site não configurada');
      }

      await this.initialize();

      // Verifica se precisa fazer scraping
      const stats = this.vectorStore.getStats();
      if (!forceRefresh && stats.totalDocuments > 0) {
        const lastUpdate = stats.lastUpdated ? new Date(stats.lastUpdated) : null;
        const daysSinceUpdate = lastUpdate ? 
          (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
        
        if (daysSinceUpdate < 1) { // Menos de 1 dia
          console.log('Conteúdo ainda está atualizado, pulando scraping');
          return {
            success: true,
            documentsIndexed: stats.totalDocuments
          };
        }
      }

      console.log('Iniciando indexação do site...');
      
      // Limpa dados antigos se forçando refresh
      if (forceRefresh) {
        this.vectorStore.clear();
      }

      // Executa scraping
      const scrapedContent = await this.webScraper.scrapeWebsite(this.config.scrapingOptions);
      
      if (scrapedContent.length === 0) {
        throw new Error('Nenhum conteúdo foi extraído do site');
      }

      // Adiciona ao vector store
      await this.vectorStore.addDocuments(scrapedContent);
      
      this.lastScrapingTime = new Date().toISOString();
      
      const finalStats = this.vectorStore.getStats();
      
      console.log(`Indexação concluída: ${finalStats.totalDocuments} documentos de ${finalStats.totalUrls} URLs`);
      
      return {
        success: true,
        documentsIndexed: finalStats.totalDocuments
      };
      
    } catch (error) {
      console.error('Erro durante indexação:', error);
      return {
        success: false,
        documentsIndexed: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Busca contexto relevante para uma query
   */
  async searchContext(query: string): Promise<RAGContext> {
    const startTime = Date.now();
    
    await this.initialize();
    
    try {
      // Executa busca híbrida
      const searchResults = await this.vectorStore.hybridSearch(
        query, 
        this.config.searchLimit!
      );
      
      // Processa resultados
      const relevantContent = searchResults.map(result => ({
        content: this.truncateContent(result.document.content, this.config.contextMaxLength! / this.config.searchLimit!),
        source: result.document.metadata.url,
        title: result.document.metadata.title,
        similarity: Math.round(result.similarity * 100) / 100
      }));
      
      const searchTime = Date.now() - startTime;
      
      return {
        query,
        relevantContent,
        totalSources: new Set(relevantContent.map(c => c.source)).size,
        searchTime
      };
      
    } catch (error) {
      console.error('Erro na busca de contexto:', error);
      return {
        query,
        relevantContent: [],
        totalSources: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Trunca conteúdo mantendo palavras completas
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    const truncated = content.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    return lastSpaceIndex > maxLength * 0.8 ? 
      truncated.substring(0, lastSpaceIndex) + '...' : 
      truncated + '...';
  }

  /**
   * Formata contexto para uso com LLM
   */
  formatContextForLLM(context: RAGContext): string {
    if (context.relevantContent.length === 0) {
      return 'Nenhum contexto relevante encontrado na base de conhecimento.';
    }
    
    let formattedContext = `Contexto relevante encontrado (${context.totalSources} fontes):\n\n`;
    
    context.relevantContent.forEach((item, index) => {
      formattedContext += `[${index + 1}] ${item.title}\n`;
      formattedContext += `Fonte: ${item.source}\n`;
      formattedContext += `Relevância: ${(item.similarity * 100).toFixed(1)}%\n`;
      formattedContext += `Conteúdo: ${item.content}\n\n`;
    });
    
    return formattedContext;
  }

  /**
   * Indexa dados de funcionários do localStorage
   */
  private async indexEmployees(): Promise<void> {
    try {
      const stored = localStorage.getItem('torp_employees');
      if (!stored) {
        console.log('Nenhum dado de funcionários encontrado no localStorage');
        return;
      }

      const employees = JSON.parse(stored);
      const documents = employees.map((emp: any) => ({
        id: emp.id,
        content: JSON.stringify(emp),
        metadata: {
          type: 'employee' as const,
          name: emp.name,
          department: emp.department,
          updatedAt: new Date().toISOString()
        }
      }));

      await this.vectorStore.addInternalDocuments(documents);
      console.log(`Indexados ${employees.length} funcionários`);
    } catch (error) {
      console.error('Erro ao indexar funcionários:', error);
    }
  }

  /**
   * Obtém estatísticas do RAG
   */
  getStats(): {
    isInitialized: boolean;
    hasWebsiteUrl: boolean;
    vectorStoreStats: ReturnType<VectorStoreService['getStats']>;
    lastScrapingTime: string | null;
    config: RAGConfig;
  } {
    return {
      isInitialized: this.isInitialized,
      hasWebsiteUrl: !!this.config.websiteUrl,
      vectorStoreStats: this.vectorStore.getStats(),
      lastScrapingTime: this.lastScrapingTime,
      config: this.config
    };
  }

  /**
   * Atualiza configuração
   */
  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Se URL mudou, cria novo web scraper
    if (newConfig.websiteUrl && newConfig.websiteUrl !== this.config.websiteUrl) {
      this.webScraper = new ProxyScrapingService(newConfig.websiteUrl);
      // Limpa vector store pois é de outro site
      this.vectorStore.clear();
    }
  }

  /**
   * Verifica se o RAG está pronto para uso
   */
  isReady(): boolean {
    const stats = this.vectorStore.getStats();
    return this.isInitialized && stats.totalDocuments > 0;
  }

  /**
   * Limpa todos os dados
   */
  clear(): void {
    this.vectorStore.clear();
    this.lastScrapingTime = null;
    console.log('RAG limpo');
  }
}

export default RAGService;