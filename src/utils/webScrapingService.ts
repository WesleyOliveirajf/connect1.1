/**
 * Serviço de Web Scraping para sistema RAG
 * Extrai conteúdo de sites para alimentar o sistema de busca semântica
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

class WebScrapingService {
  private baseUrl: string;
  private visitedUrls: Set<string> = new Set();
  private scrapedContent: ScrapedContent[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = this.normalizeUrl(baseUrl);
  }

  /**
   * Normaliza URL removendo trailing slash e fragmentos
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.replace(/\/$/, '');
    } catch {
      throw new Error(`URL inválida: ${url}`);
    }
  }

  /**
   * Extrai conteúdo de uma única página
   */
  private async scrapePage(url: string): Promise<ScrapedContent | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OracleBot/1.0)'
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        console.warn(`Erro ao acessar ${url}: ${response.status}`);
        return null;
      }

      const html = await response.text();
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
      console.error(`Erro ao fazer scraping de ${url}:`, error);
      return null;
    }
  }

  /**
   * Extrai texto limpo do HTML
   */
  private extractTextContent(html: string): string {
    // Remove scripts, styles e comentários
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

    // Remove todas as tags HTML
    cleanHtml = cleanHtml.replace(/<[^>]*>/g, ' ');

    // Decodifica entidades HTML básicas
    cleanHtml = cleanHtml
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Limpa espaços extras e quebras de linha
    return cleanHtml
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Extrai título da página
   */
  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  /**
   * Extrai links da página
   */
  private extractLinks(html: string, currentUrl: string): string[] {
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const href = match[1];
        let fullUrl: string;

        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('/')) {
          const baseUrlObj = new URL(this.baseUrl);
          fullUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${href}`;
        } else {
          fullUrl = new URL(href, currentUrl).href;
        }

        // Só inclui links do mesmo domínio
        const baseUrlObj = new URL(this.baseUrl);
        const linkUrlObj = new URL(fullUrl);
        
        if (linkUrlObj.host === baseUrlObj.host) {
          links.push(this.normalizeUrl(fullUrl));
        }
      } catch {
        // Ignora links inválidos
      }
    }

    return [...new Set(links)]; // Remove duplicatas
  }

  /**
   * Verifica se URL deve ser incluída baseado nos padrões
   */
  private shouldIncludeUrl(url: string, options: ScrapingOptions): boolean {
    const { excludePatterns = [], includePatterns = [] } = options;

    // Verifica padrões de exclusão
    for (const pattern of excludePatterns) {
      if (url.includes(pattern)) {
        return false;
      }
    }

    // Se há padrões de inclusão, verifica se URL corresponde
    if (includePatterns.length > 0) {
      return includePatterns.some(pattern => url.includes(pattern));
    }

    return true;
  }

  /**
   * Executa scraping completo do site
   */
  async scrapeWebsite(options: ScrapingOptions = {}): Promise<ScrapedContent[]> {
    const {
      maxPages = 50,
      followLinks = true,
      timeout = 30000
    } = options;

    this.visitedUrls.clear();
    this.scrapedContent = [];

    const urlsToVisit = [this.baseUrl];
    let processedPages = 0;

    console.log(`Iniciando scraping de ${this.baseUrl}`);

    while (urlsToVisit.length > 0 && processedPages < maxPages) {
      const currentUrl = urlsToVisit.shift()!;

      if (this.visitedUrls.has(currentUrl)) {
        continue;
      }

      if (!this.shouldIncludeUrl(currentUrl, options)) {
        this.visitedUrls.add(currentUrl);
        continue;
      }

      console.log(`Processando: ${currentUrl}`);
      this.visitedUrls.add(currentUrl);

      const scrapedPage = await this.scrapePage(currentUrl);
      
      if (scrapedPage) {
        this.scrapedContent.push(scrapedPage);
        
        // Se deve seguir links, extrai e adiciona à fila
        if (followLinks && processedPages < maxPages - 1) {
          try {
            const response = await fetch(currentUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OracleBot/1.0)' },
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              const html = await response.text();
              const links = this.extractLinks(html, currentUrl);
              
              for (const link of links) {
                if (!this.visitedUrls.has(link) && !urlsToVisit.includes(link)) {
                  urlsToVisit.push(link);
                }
              }
            }
          } catch {
            // Ignora erros ao extrair links
          }
        }
      }

      processedPages++;
      
      // Pequena pausa entre requisições
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Scraping concluído: ${this.scrapedContent.length} páginas processadas`);
    return this.scrapedContent;
  }

  /**
   * Obtém conteúdo já extraído
   */
  getScrapedContent(): ScrapedContent[] {
    return [...this.scrapedContent];
  }

  /**
   * Limpa cache de conteúdo
   */
  clearCache(): void {
    this.visitedUrls.clear();
    this.scrapedContent = [];
  }
}

export default WebScrapingService;