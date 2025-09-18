/**
 * Serviço RAG Simplificado (Retrieval-Augmented Generation)
 * APENAS para dados web externos - funcionários usam busca direta
 */

import ProxyScrapingService, { type ScrapedContent, type ScrapingOptions } from './proxyScrapingService';
import vectorStoreService, { type SearchResult } from './vectorStoreService';
import { getConfigForQuery, type RAGSearchConfig } from '../config/ragConfig';

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
  private vectorStore: typeof vectorStoreService;
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
    
    this.vectorStore = vectorStoreService;
    
    if (this.config.websiteUrl) {
      this.webScraper = new ProxyScrapingService(this.config.websiteUrl);
    }
  }

  /**
   * Inicializa o serviço RAG (apenas para dados web)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[RAGService] ⚠️ RAG já foi inicializado, pulando...');
      return;
    }

    console.log('[RAGService] 🚀 Iniciando RAG Service (apenas dados web)...');

    await this.vectorStore.initialize();
    console.log('[RAGService] ✅ Vector store inicializado');

    // REMOVIDO: indexação de funcionários (agora usa busca direta)
    // REMOVIDO: indexação de comunicados (redundante para dados internos)

    const stats = this.vectorStore.getStats();
    this.lastScrapingTime = stats.lastUpdated;

    console.log('[RAGService] 📊 Estatísticas do vector store:', stats);
    console.log('[RAGService] ✅ RAG inicializado para dados web externos');

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
      const scrapedContent = await this.webScraper.scrapeWebsite();
      
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
   * Busca contexto relevante APENAS em dados web externos
   * Funcionários e dados internos usam busca direta (employeeSearchService)
   */
  async searchWebContext(query: string): Promise<RAGContext> {
    const startTime = Date.now();

    await this.initialize();

    try {
      console.log(`🌐 Buscando contexto web para: ${query}`);

      // Busca apenas em dados web
      const webResults = await this.vectorStore.searchWebOnly(query, this.config.searchLimit || 5);

      const relevantContent = webResults.map(result => ({
        content: this.truncateContent(result.document.content, this.config.contextMaxLength! / this.config.searchLimit!),
        source: result.document.metadata.url || 'web',
        title: result.document.metadata.title || 'Conteúdo Web',
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
      console.error('Erro na busca web:', error);
      return {
        query,
        relevantContent: [],
        totalSources: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  // REMOVIDO: searchInternalDataOnly - agora usa employeeSearchService
  // REMOVIDO: searchWebDataOnly - integrado em searchWebContext

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
   * Formata contexto web para uso com LLM
   */
  formatWebContextForLLM(context: RAGContext): string {
    if (context.relevantContent.length === 0) {
      return 'Nenhum contexto web relevante encontrado.';
    }

    let formattedContext = `=== 🌐 INFORMAÇÕES DA WEB (${context.totalSources} fontes) ===\n\n`;

    context.relevantContent.forEach((item, index) => {
      formattedContext += `${index + 1}. ${item.title}\n`;
      formattedContext += `   ${this.truncateContent(item.content, 250)}\n`;
      formattedContext += `   Fonte: ${item.source}\n`;
      formattedContext += `   Relevância: ${(item.similarity * 100).toFixed(1)}%\n\n`;
    });

    formattedContext += `\n⏱️ Busca realizada em ${context.searchTime}ms\n`;
    formattedContext += `📊 Query: "${context.query}"\n\n`;
    formattedContext += `INSTRUÇÕES: Estas são informações complementares da web. Use apenas como contexto adicional.`;

    return formattedContext;
  }

  // REMOVIDO: extractEmployeeInfo - agora usa employeeSearchService
  // REMOVIDO: extractAnnouncementInfo - dados internos não usam mais RAG

  // REMOVIDO: indexEmployees - funcionários usam busca direta com employeeSearchService

  // REMOVIDO: indexAnnouncements - comunicados podem usar busca direta ou serem eliminados

  // REMOVIDO: formatEmployeeForIndexing - não mais necessário
  // REMOVIDO: formatAnnouncementForIndexing - não mais necessário

  // REMOVIDO: searchEmployees - agora usa employeeSearchService diretamente

  /**
   * Obtém estatísticas do RAG
   */
  getStats(): {
    isInitialized: boolean;
    hasWebsiteUrl: boolean;
    vectorStoreStats: ReturnType<typeof vectorStoreService['getStats']>;
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
export { RAGService };
