/**
 * Serviço de scraping via proxy para contornar limitações de CORS
 * Compatível com ambiente Vercel
 */

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    description?: string;
    keywords?: string[];
    lastModified?: string;
    contentType?: string;
    wordCount?: number;
    language?: string;
  };
}

export interface ScrapingOptions {
  maxPages?: number;
  delay?: number;
  timeout?: number;
  userAgent?: string;
  retries?: number;
}

class ProxyScrapingService {
  private baseUrl: string;
  private options: ScrapingOptions;
  private cache: Map<string, ScrapedContent> = new Map();
  private isVercelEnvironment: boolean;

  constructor(baseUrl: string, options: ScrapingOptions = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      maxPages: 10,
      delay: 1000,
      timeout: 10000,
      userAgent: 'Mozilla/5.0 (compatible; TORPBot/1.0)',
      retries: 2,
      ...options
    };
    
    // Detecta se está rodando no Vercel
    this.isVercelEnvironment = !!(
      process.env.VERCEL || 
      process.env.VERCEL_ENV || 
      typeof window === 'undefined'
    );
    
    console.log(`[ProxyScrapingService] Ambiente Vercel: ${this.isVercelEnvironment}`);
  }

  /**
   * Normaliza URL para evitar duplicatas
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove fragmentos e alguns parâmetros de tracking
      urlObj.hash = '';
      urlObj.searchParams.delete('utm_source');
      urlObj.searchParams.delete('utm_medium');
      urlObj.searchParams.delete('utm_campaign');
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Faz scraping de uma página via proxy CORS
   */
  async scrapePageViaProxy(url: string): Promise<ScrapedContent | null> {
    const normalizedUrl = this.normalizeUrl(url);
    
    // Verifica cache primeiro
    if (this.cache.has(normalizedUrl)) {
      console.log(`[ProxyScrapingService] Cache hit para: ${normalizedUrl}`);
      return this.cache.get(normalizedUrl)!;
    }

    try {
      console.log(`[ProxyScrapingService] Fazendo scraping de: ${normalizedUrl}`);
      
      // No Vercel, usa estratégia mais conservadora
      const timeout = this.isVercelEnvironment ? 5000 : this.options.timeout!;
      const maxRetries = this.isVercelEnvironment ? 1 : this.options.retries!;
      
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Usa AllOrigins como proxy CORS
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'User-Agent': this.options.userAgent!,
              'Accept': 'application/json',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (!data.contents) {
            throw new Error('Conteúdo vazio retornado pelo proxy');
          }
          
          // Extrai conteúdo e metadados
          const content = this.extractTextContent(data.contents);
          const title = this.extractTitle(data.contents);
          
          const scrapedContent: ScrapedContent = {
            url: normalizedUrl,
            title: title || 'Sem título',
            content,
            metadata: {
              description: this.extractMetaDescription(data.contents),
              keywords: this.extractKeywords(data.contents),
              lastModified: new Date().toISOString(),
              contentType: 'text/html',
              wordCount: content.split(/\s+/).length,
              language: this.detectLanguage(content)
            }
          };
          
          // Armazena no cache apenas em desenvolvimento
          if (!this.isVercelEnvironment) {
            this.cache.set(normalizedUrl, scrapedContent);
          }
          
          console.log(`[ProxyScrapingService] Sucesso: ${title} (${scrapedContent.metadata.wordCount} palavras)`);
          return scrapedContent;
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`[ProxyScrapingService] Tentativa ${attempt + 1} falhou:`, error);
          
          if (attempt < maxRetries) {
            const delay = this.isVercelEnvironment ? 500 : this.options.delay!;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError || new Error('Todas as tentativas falharam');
      
    } catch (error) {
      console.error(`[ProxyScrapingService] Erro ao fazer scraping de ${normalizedUrl}:`, error);
      return null;
    }
  }

  /**
   * Extrai texto limpo do HTML
   */
  private extractTextContent(html: string): string {
    try {
      // Remove scripts, styles e comentários
      let cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');
      
      // Remove tags HTML
      cleanHtml = cleanHtml.replace(/<[^>]+>/g, ' ');
      
      // Decodifica entidades HTML
      cleanHtml = cleanHtml
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      
      // Limpa espaços extras
      cleanHtml = cleanHtml
        .replace(/\s+/g, ' ')
        .trim();
      
      return cleanHtml;
    } catch (error) {
      console.error('[ProxyScrapingService] Erro ao extrair texto:', error);
      return '';
    }
  }

  /**
   * Extrai título da página
   */
  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      return h1Match[1].replace(/<[^>]+>/g, '').trim();
    }
    
    return '';
  }

  /**
   * Extrai meta description
   */
  private extractMetaDescription(html: string): string {
    const match = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    return match ? match[1].trim() : '';
  }

  /**
   * Extrai keywords
   */
  private extractKeywords(html: string): string[] {
    const match = html.match(/<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    if (match) {
      return match[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    return [];
  }

  /**
   * Detecta idioma do conteúdo
   */
  private detectLanguage(content: string): string {
    // Detecção simples baseada em palavras comuns
    const portugueseWords = ['que', 'para', 'com', 'uma', 'por', 'não', 'mais', 'como', 'seu', 'foi'];
    const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had'];
    
    const words = content.toLowerCase().split(/\s+/).slice(0, 100);
    
    let ptCount = 0;
    let enCount = 0;
    
    words.forEach(word => {
      if (portugueseWords.includes(word)) ptCount++;
      if (englishWords.includes(word)) enCount++;
    });
    
    return ptCount > enCount ? 'pt' : 'en';
  }

  /**
   * Faz scraping do website completo
   */
  async scrapeWebsite(): Promise<ScrapedContent[]> {
    console.log(`[ProxyScrapingService] Iniciando scraping de: ${this.baseUrl}`);
    
    const results: ScrapedContent[] = [];
    const urlsToScrape = this.getImportantUrls();
    
    // No Vercel, limita ainda mais o número de páginas
    const maxPages = this.isVercelEnvironment ? 
      Math.min(3, this.options.maxPages!) : 
      this.options.maxPages!;
    
    const limitedUrls = urlsToScrape.slice(0, maxPages);
    
    console.log(`[ProxyScrapingService] Fazendo scraping de ${limitedUrls.length} páginas (limite: ${maxPages})`);
    
    for (const url of limitedUrls) {
      try {
        const content = await this.scrapePageViaProxy(url);
        if (content && content.content.length > 100) {
          results.push(content);
        }
        
        // Delay entre requisições (menor no Vercel)
        const delay = this.isVercelEnvironment ? 200 : this.options.delay!;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`[ProxyScrapingService] Erro ao processar ${url}:`, error);
      }
    }
    
    console.log(`[ProxyScrapingService] Scraping concluído: ${results.length} páginas processadas`);
    return results;
  }

  /**
   * Define URLs importantes para scraping
   */
  private getImportantUrls(): string[] {
    const baseUrls = [
      this.baseUrl,
      `${this.baseUrl}/sobre`,
      `${this.baseUrl}/servicos`,
      `${this.baseUrl}/contato`,
      `${this.baseUrl}/produtos`,
      `${this.baseUrl}/empresa`,
      `${this.baseUrl}/equipe`,
      `${this.baseUrl}/noticias`,
      `${this.baseUrl}/blog`
    ];
    
    return baseUrls.map(url => this.normalizeUrl(url));
  }

  /**
   * Obtém conteúdo do cache
   */
  getScrapedContent(): ScrapedContent[] {
    return Array.from(this.cache.values());
  }

  /**
   * Limpa o cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[ProxyScrapingService] Cache limpo');
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      isVercelEnvironment: this.isVercelEnvironment,
      maxPages: this.options.maxPages,
      timeout: this.options.timeout
    };
  }
}

export default ProxyScrapingService;