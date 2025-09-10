/**
 * Serviço de Web Scraping via Proxy para contornar CORS
 * Usa APIs públicas para extrair conteúdo de sites
 */

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    scrapedAt: string;
    wordCount: number;
    contentType: string;
  };
}

export interface ScrapingOptions {
  maxPages?: number;
  followLinks?: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
  timeout?: number;
}

class ProxyScrapingService {
  private baseUrl: string;
  private scrapedContent: ScrapedContent[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = this.normalizeUrl(baseUrl);
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.replace(/\/$/, '');
    } catch {
      throw new Error(`URL inválida: ${url}`);
    }
  }

  /**
   * Extrai conteúdo usando AllOrigins API (proxy CORS)
   */
  private async scrapePageViaProxy(url: string): Promise<ScrapedContent | null> {
    try {
      console.log(`Fazendo scraping de: ${url}`);
      
      // Usar AllOrigins como proxy CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Erro ao acessar proxy para ${url}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.contents) {
        console.warn(`Sem conteúdo retornado para ${url}`);
        return null;
      }

      const html = data.contents;
      const content = this.extractTextContent(html);
      const title = this.extractTitle(html);

      if (!content || content.length < 100) {
        console.warn(`Conteúdo insuficiente em ${url}`);
        return null;
      }

      return {
        url,
        title: title || 'Sem título',
        content: content.trim(),
        metadata: {
          scrapedAt: new Date().toISOString(),
          wordCount: content.split(/\s+/).length,
          contentType: 'text/html'
        }
      };
    } catch (error) {
      console.error(`Erro ao fazer scraping via proxy de ${url}:`, error);
      return null;
    }
  }

  /**
   * Extrai texto limpo do HTML
   */
  private extractTextContent(html: string): string {
    // Remove scripts e styles
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove comentários HTML
    cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove tags HTML mas mantém o conteúdo
    cleanHtml = cleanHtml.replace(/<[^>]+>/g, ' ');
    
    // Decodifica entidades HTML básicas
    cleanHtml = cleanHtml
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Limpa espaços extras e quebras de linha
    cleanHtml = cleanHtml
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return cleanHtml;
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  /**
   * Faz scraping do site principal e algumas páginas importantes
   */
  async scrapeWebsite(options: ScrapingOptions = {}): Promise<ScrapedContent[]> {
    const {
      maxPages = 5, // Reduzido para evitar rate limiting
    } = options;

    this.scrapedContent = [];
    
    console.log(`Iniciando scraping de ${this.baseUrl}`);
    
    // URLs importantes para scraping
    const urlsToScrape = [
      this.baseUrl,
      `${this.baseUrl}/sobre`,
      `${this.baseUrl}/servicos`,
      `${this.baseUrl}/contato`,
      `${this.baseUrl}/produtos`
    ].slice(0, maxPages);

    const promises = urlsToScrape.map(async (url) => {
      try {
        const content = await this.scrapePageViaProxy(url);
        if (content) {
          this.scrapedContent.push(content);
        }
      } catch (error) {
        console.error(`Erro ao processar ${url}:`, error);
      }
    });

    await Promise.all(promises);
    
    console.log(`Scraping concluído: ${this.scrapedContent.length} páginas processadas`);
    
    return this.scrapedContent;
  }

  /**
   * Retorna conteúdo já extraído
   */
  getScrapedContent(): ScrapedContent[] {
    return [...this.scrapedContent];
  }

  /**
   * Limpa cache de conteúdo
   */
  clearCache(): void {
    this.scrapedContent = [];
  }
}

export default ProxyScrapingService;