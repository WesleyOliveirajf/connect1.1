/**
 * Serviço RAG (Retrieval-Augmented Generation)
 * Integra web scraping, vector store e busca semântica
 */

import ProxyScrapingService, { type ScrapedContent, type ScrapingOptions } from './proxyScrapingService';
import VectorStoreService, { type SearchResult } from './vectorStoreService';
import { VectorDocument } from './vectorStoreService'; // Ajustar se necessário
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
      console.log('[RAGService] ⚠️ RAG já foi inicializado, pulando...');
      return;
    }
    
    console.log('[RAGService] 🚀 Iniciando inicialização do RAG Service...');
    
    await this.vectorStore.initialize();
    console.log('[RAGService] ✅ Vector store inicializado');
    
    // Indexa dados de funcionários
    await this.indexEmployees();
    
    // Indexa comunicados da empresa
    await this.indexAnnouncements();
    
    // Verifica se há dados no vector store
    const stats = this.vectorStore.getStats();
    this.lastScrapingTime = stats.lastUpdated;
    
    console.log('[RAGService] 📊 Estatísticas do vector store:', stats);
    
    if (stats.totalDocuments === 0) {
      console.log('[RAGService] ⚠️ Vector store vazio. Será necessário fazer scraping inicial.');
    } else {
      console.log(`[RAGService] ✅ RAG inicializado com ${stats.totalDocuments} documentos de ${stats.totalUrls} URLs`);
    }
    
    this.isInitialized = true;
    console.log('[RAGService] 🎉 Inicialização do RAG Service concluída com sucesso!');
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
   * PRIORIZA SEMPRE dados internos (funcionários + comunicados) antes de buscar na web
   */
  async searchContext(query: string): Promise<RAGContext & { needsWebSearch?: boolean; internalResultsCount?: number }> {
    const startTime = Date.now();
    
    await this.initialize();
    
    try {
      // Obtém configuração otimizada para este tipo de consulta
      const searchConfig = getConfigForQuery(query);
      console.log(`🔍 Tipo de consulta detectado: ${query} | Threshold: ${searchConfig.internalDataThreshold}`);
      
      // ETAPA 1: Busca APENAS em dados internos (funcionários + comunicados)
      const internalResults = await this.searchInternalDataOnly(query, searchConfig);
      
      // Verifica se encontrou informações suficientes nos dados internos
      const hasGoodInternalResults = internalResults.length >= searchConfig.minInternalResults && 
        internalResults.some(result => result.similarity > searchConfig.internalDataThreshold);
      
      let allResults = internalResults;
      let needsWebSearch = false;
      
      // ETAPA 2: Se não encontrou informações suficientes, busca na web
      if (!hasGoodInternalResults) {
        needsWebSearch = true;
        console.log(`🌐 Dados internos insuficientes (${internalResults.length} resultados, melhor similaridade: ${internalResults[0]?.similarity || 0}), buscando na web...`);
        
        const webResults = await this.searchWebDataOnly(query, searchConfig);
        allResults = [...internalResults, ...webResults];
      } else {
        console.log(`✅ Informações encontradas nos dados internos da TORP (${internalResults.length} resultados relevantes)`);
      }
      
      // Processa resultados finais
      const relevantContent = allResults
        .slice(0, this.config.searchLimit!)
        .map(result => ({
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
        searchTime,
        needsWebSearch,
        internalResultsCount: internalResults.length
      };
      
    } catch (error) {
      console.error('Erro na busca de contexto:', error);
      return {
        query,
        relevantContent: [],
        totalSources: 0,
        searchTime: Date.now() - startTime,
        needsWebSearch: false,
        internalResultsCount: 0
      };
    }
  }

  /**
   * Busca APENAS em dados internos (funcionários e comunicados)
   */
  private async searchInternalDataOnly(query: string, config: RAGSearchConfig): Promise<SearchResult[]> {
    const allResults = await this.vectorStore.hybridSearch(query, config.internalSearchLimit);
    
    // Filtra apenas resultados de dados internos
    const internalResults = allResults.filter(result => {
      const source = result.document.metadata.url || '';
      const content = result.document.content || '';
      
      return source.includes('employee') || 
             source.includes('announcement') || 
             content.includes('Funcionário:') || 
             content.includes('Comunicado:');
    });
    
    // Aplica boost para dados internos
    return internalResults.map(result => ({
      ...result,
      similarity: Math.min(result.similarity * config.internalDataBoost, 1.0)
    })).filter(result => result.similarity >= config.minSimilarity);
  }

  /**
   * Busca APENAS em dados da web (exclui dados internos)
   */
  private async searchWebDataOnly(query: string, config: RAGSearchConfig): Promise<SearchResult[]> {
    const allResults = await this.vectorStore.hybridSearch(query, config.webSearchLimit);
    
    // Filtra apenas resultados de dados externos
    return allResults.filter(result => {
      const source = result.document.metadata.url || '';
      const content = result.document.content || '';
      
      return !source.includes('employee') && 
             !source.includes('announcement') && 
             !content.includes('Funcionário:') && 
             !content.includes('Comunicado:') &&
             result.similarity >= config.minSimilarity;
    });
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
   * Formata contexto otimizado para uso com LLM
   */
  formatContextForLLM(context: RAGContext & { needsWebSearch?: boolean; internalResultsCount?: number }): string {
    if (context.relevantContent.length === 0) {
      return 'Nenhum contexto relevante encontrado na base de conhecimento da TORP.';
    }
    
    // Separa conteúdo por tipo para melhor organização
    const employees = context.relevantContent.filter(item => 
      (item.source && item.source.includes('employee')) || item.content.includes('Funcionário:')
    );
    const announcements = context.relevantContent.filter(item => 
      (item.source && item.source.includes('announcement')) || item.content.includes('Comunicado:')
    );
    const webContent = context.relevantContent.filter(item => 
      (!item.source || (!item.source.includes('employee') && !item.source.includes('announcement'))) && 
      !item.content.includes('Funcionário:') && !item.content.includes('Comunicado:')
    );
    
    // Cabeçalho com informações sobre a origem dos dados
    const dataOrigin = context.needsWebSearch ? 
      `📊 DADOS INTERNOS (${context.internalResultsCount || 0}) + WEB (${context.totalSources - (context.internalResultsCount || 0)})` :
      `📊 DADOS INTERNOS DA TORP (${context.totalSources} fontes)`;
    
    let formattedContext = `=== ${dataOrigin} ===\n\n`;
    
    // Aviso sobre origem dos dados
    if (context.needsWebSearch) {
      formattedContext += `⚠️ AVISO: Dados internos insuficientes. Incluindo informações da web.\n\n`;
    } else {
      formattedContext += `✅ INFORMAÇÕES ENCONTRADAS NOS DADOS INTERNOS DA TORP\n\n`;
    }
    
    // Seção de funcionários
    if (employees.length > 0) {
      formattedContext += `👥 FUNCIONÁRIOS E CONTATOS:\n`;
      employees.forEach((item, index) => {
        formattedContext += `${index + 1}. ${this.extractEmployeeInfo(item.content)}\n`;
        formattedContext += `   Relevância: ${(item.similarity * 100).toFixed(1)}%\n\n`;
      });
    }
    
    // Seção de comunicados
    if (announcements.length > 0) {
      formattedContext += `📢 COMUNICADOS E AVISOS:\n`;
      announcements.forEach((item, index) => {
        formattedContext += `${index + 1}. ${this.extractAnnouncementInfo(item.content)}\n`;
        formattedContext += `   Relevância: ${(item.similarity * 100).toFixed(1)}%\n\n`;
      });
    }
    
    // Seção de conteúdo web
    if (webContent.length > 0) {
      formattedContext += `🌐 INFORMAÇÕES ADICIONAIS:\n`;
      webContent.forEach((item, index) => {
        formattedContext += `${index + 1}. ${item.title}\n`;
        formattedContext += `   ${this.truncateContent(item.content, 200)}\n`;
        formattedContext += `   Fonte: ${item.source}\n`;
        formattedContext += `   Relevância: ${(item.similarity * 100).toFixed(1)}%\n\n`;
      });
    }
    
    formattedContext += `\n⏱️ Busca realizada em ${context.searchTime}ms\n`;
    formattedContext += `📊 Query: "${context.query}"\n`;
    
    if (context.needsWebSearch) {
      formattedContext += `🔍 Origem: Dados internos + Web (dados internos insuficientes)\n\n`;
      formattedContext += `INSTRUÇÕES: PRIORIZE SEMPRE os dados internos da TORP (funcionários e comunicados). Use informações da web apenas como complemento quando os dados internos não forem suficientes. INFORME ao usuário quando estiver usando informações externas.`;
    } else {
      formattedContext += `🔍 Origem: Apenas dados internos da TORP\n\n`;
      formattedContext += `INSTRUÇÕES: Todas as informações são dos dados internos da TORP. Responda com base exclusivamente nessas informações internas (funcionários e comunicados).`;
    }
    
    return formattedContext;
  }

  /**
   * Extrai informações estruturadas de funcionário
   */
  private extractEmployeeInfo(content: string): string {
    const lines = content.split('\n');
    const info: any = {};
    
    lines.forEach(line => {
      if (line.includes('Funcionário:')) info.name = line.replace('Funcionário:', '').trim();
      if (line.includes('Departamento:')) info.department = line.replace('Departamento:', '').trim();
      if (line.includes('Ramal:')) info.extension = line.replace('Ramal:', '').trim();
      if (line.includes('Email:')) info.email = line.replace('Email:', '').trim();
      if (line.includes('Horário de almoço:')) info.lunchTime = line.replace('Horário de almoço:', '').trim();
    });
    
    let result = `${info.name || 'Nome não encontrado'}`;
    if (info.department) result += ` - ${info.department}`;
    if (info.extension) result += ` | Ramal: ${info.extension}`;
    if (info.email && info.email !== 'xxx') result += ` | Email: ${info.email}`;
    if (info.lunchTime) result += ` | Almoço: ${info.lunchTime}`;
    
    return result;
  }

  /**
   * Extrai informações estruturadas de comunicado
   */
  private extractAnnouncementInfo(content: string): string {
    const lines = content.split('\n');
    const info: any = {};
    
    lines.forEach(line => {
      if (line.includes('Comunicado:')) info.title = line.replace('Comunicado:', '').trim();
      if (line.includes('Prioridade:')) info.priority = line.replace('Prioridade:', '').trim();
      if (line.includes('Data:')) info.date = line.replace('Data:', '').trim();
      if (line.includes('Conteúdo:')) info.content = line.replace('Conteúdo:', '').trim();
    });
    
    let result = `${info.title || 'Título não encontrado'}`;
    if (info.priority) result += ` [${info.priority.toUpperCase()}]`;
    if (info.date) result += ` - ${info.date}`;
    if (info.content) result += `\n   ${this.truncateContent(info.content, 150)}`;
    
    return result;
  }

  /**
   * Indexa dados de funcionários do localStorage
   */
  private async indexEmployees(): Promise<void> {
    try {
      console.log('[RAGService] Verificando dados de funcionários no localStorage...');
      const stored = localStorage.getItem('torp_employees');
      if (!stored) {
        console.log('[RAGService] Nenhum dado de funcionários encontrado no localStorage');
        return;
      }

      const employees = JSON.parse(stored);
      console.log(`[RAGService] Encontrados ${employees.length} funcionários no localStorage:`, employees.slice(0, 3));
      
      const documents = employees.map((emp: any) => ({
        id: `employee_${emp.id}`,
        content: this.formatEmployeeForIndexing(emp),
        metadata: {
          type: 'employee' as const,
          name: emp.name,
          department: emp.department,
          updatedAt: new Date().toISOString()
        }
      }));

      console.log('[RAGService] Documentos formatados para indexação:', documents.slice(0, 2));
      await this.vectorStore.addInternalDocuments(documents);
      console.log(`[RAGService] Indexados ${employees.length} funcionários com sucesso`);
    } catch (error) {
      console.error('[RAGService] Erro ao indexar funcionários:', error);
    }
  }

  /**
   * Indexa comunicados da empresa do localStorage
   */
  private async indexAnnouncements(): Promise<void> {
    try {
      // Tenta carregar comunicados criptografados primeiro
      let announcements = null;
      
      try {
        // Importa funções de criptografia dinamicamente
        const { getEncryptedStorage } = await import('./encryption');
        announcements = getEncryptedStorage('torp_announcements');
      } catch (encError) {
        console.log('Tentando carregar comunicados não criptografados...');
        const stored = localStorage.getItem('torp_announcements');
        if (stored) {
          announcements = JSON.parse(stored);
        }
      }

      if (!announcements || !Array.isArray(announcements)) {
        console.log('Nenhum comunicado encontrado para indexação');
        return;
      }

      const documents = announcements.map((ann: any) => ({
        id: `announcement_${ann.id}`,
        content: this.formatAnnouncementForIndexing(ann),
        metadata: {
          type: 'web' as const, // Usa 'web' para compatibilidade com o sistema atual
          url: `internal://announcement/${ann.id}`,
          title: ann.title,
          chunkIndex: 0,
          totalChunks: 1,
          wordCount: ann.content.split(' ').length,
          scrapedAt: ann.createdAt || new Date().toISOString()
        }
      }));

      await this.vectorStore.addInternalDocuments(documents);
      console.log(`Indexados ${announcements.length} comunicados`);
    } catch (error) {
      console.error('Erro ao indexar comunicados:', error);
    }
  }

  /**
   * Formata dados do funcionário para indexação otimizada
   */
  private formatEmployeeForIndexing(employee: any): string {
    const parts = [
      `Funcionário: ${employee.name}`,
      `Departamento: ${employee.department}`,
      `Ramal: ${employee.extension}`,
      `Email: ${employee.email}`,
    ];

    if (employee.lunchTime) {
      parts.push(`Horário de almoço: ${employee.lunchTime}`);
    }

    // Adiciona termos de busca alternativos
    parts.push(`Setor: ${employee.department}`);
    parts.push(`Extensão: ${employee.extension}`);
    parts.push(`Contato: ${employee.name} - ${employee.extension}`);

    return parts.join('\n');
  }

  /**
   * Formata comunicado para indexação otimizada
   */
  private formatAnnouncementForIndexing(announcement: any): string {
    const parts = [
      `Comunicado: ${announcement.title}`,
      `Prioridade: ${announcement.priority}`,
      `Data: ${announcement.date}`,
      `Conteúdo: ${announcement.content}`,
    ];

    // Adiciona termos de busca alternativos
    parts.push(`Aviso: ${announcement.title}`);
    parts.push(`Informação: ${announcement.content}`);
    
    return parts.join('\n');
  }

  /**
   * Busca específica para funcionários com análise de consultas
   */
  async searchEmployees(query: string): Promise<{
    employees: any[];
    totalCount: number;
    departmentCounts: Record<string, number>;
    searchResults: SearchResult[];
  }> {
    try {
      console.log('[RAGService] ===== INICIANDO BUSCA DE FUNCIONÁRIOS =====');
      console.log('[RAGService] Query recebida:', query);
      
      // Buscar dados dos funcionários diretamente do localStorage
      let allEmployees: any[] = [];
      try {
        const storedEmployees = localStorage.getItem('torp_employees');
        if (storedEmployees) {
          allEmployees = JSON.parse(storedEmployees);
          console.log('[RAGService] ✅ Total de funcionários encontrados no localStorage:', allEmployees.length);
          console.log('[RAGService] Primeiros 3 funcionários:', allEmployees.slice(0, 3).map(emp => ({ name: emp.name, department: emp.department })));
        } else {
          console.warn('[RAGService] ❌ Nenhum funcionário encontrado no localStorage');
        }
      } catch (error) {
        console.error('[RAGService] ❌ Erro ao buscar funcionários no localStorage:', error);
        return {
          employees: [],
          totalCount: 0,
          departmentCounts: {},
          searchResults: []
        };
      }

      // Analisar a consulta para determinar o tipo de busca
      const queryLower = query.toLowerCase();
      let filteredEmployees: any[] = [];
      
      // Detectar consultas sobre quantidade/contagem
      const isCountQuery = /quantos?|quantidade|total|número|conta/.test(queryLower);
      
      // Detectar consultas sobre departamentos específicos
      const departmentMatches = queryLower.match(/\b(ti|comercial|administrativo|gente e gestão|marketing|controladoria|compras|prefeitura|salas?)\b/g);
      
      console.log('[RAGService] Análise da consulta:', {
        isCountQuery,
        departmentMatches,
        queryLower
      });
      
      if (departmentMatches && departmentMatches.length > 0) {
        // Busca por departamento específico
        const targetDept = departmentMatches[0];
        filteredEmployees = allEmployees.filter((emp: any) => {
          const empDept = emp.department?.toLowerCase() || '';
          return empDept.includes(targetDept) || 
                 (targetDept === 'ti' && empDept === 'ti') ||
                 (targetDept === 'gente e gestão' && empDept.includes('gente')) ||
                 (targetDept === 'compras' && empDept.includes('compras')) ||
                 (targetDept === 'prefeitura' && empDept.includes('prefeitura'));
        });
        console.log(`[RAGService] 🎯 Busca por departamento "${targetDept}":`, filteredEmployees.length, 'funcionários');
      } else if (isCountQuery && !departmentMatches) {
        // Consulta sobre total geral
        filteredEmployees = allEmployees;
        console.log('[RAGService] 📊 Consulta sobre total geral:', filteredEmployees.length, 'funcionários');
      } else {
        // Busca geral por nome, email, ramal, etc.
        filteredEmployees = allEmployees.filter((emp: any) => {
          return (
            emp.name?.toLowerCase().includes(queryLower) ||
            emp.department?.toLowerCase().includes(queryLower) ||
            emp.email?.toLowerCase().includes(queryLower) ||
            emp.extension?.toString().includes(queryLower)
          );
        });
        console.log('[RAGService] 🔍 Busca geral:', filteredEmployees.length, 'funcionários encontrados');
      }

      // Contar por departamento
      const departmentCounts: Record<string, number> = {};
      filteredEmployees.forEach((emp: any) => {
        const dept = emp.department || 'Não informado';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      });

      // Buscar também no vector store para contexto adicional
      const vectorResults = await this.searchInternalDataOnly(query, {
        internalDataThreshold: 0.1,
        minInternalResults: 1,
        internalDataBoost: 2.0,
        internalSearchLimit: 10,
        webSearchLimit: 0,
        minSimilarity: 0.05
      });

      const employeeResults = vectorResults.filter(result => 
        (result.source && result.source.includes('employee:')) || 
        (result.content && result.content.includes('Funcionário:')) ||
        (result.content && result.content.includes('Departamento:'))
      );

      console.log('[RAGService] 📊 Contagem por departamento:', departmentCounts);
      console.log('[RAGService] 🔍 Resultados do vector store:', employeeResults.length);

      const result = {
        employees: filteredEmployees,
        totalCount: filteredEmployees.length,
        departmentCounts,
        searchResults: employeeResults
      };

      console.log('[RAGService] 🎉 Resultado final:', {
        employeesReturned: result.employees.length,
        totalCount: result.totalCount,
        departmentCounts: Object.keys(result.departmentCounts).length,
        vectorResults: result.searchResults.length
      });

      return result;
    } catch (error) {
      console.error('[RAGService] ❌ Erro na busca de funcionários:', error);
      return {
        employees: [],
        totalCount: 0,
        departmentCounts: {},
        searchResults: []
      };
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
