import vercelConfig from '../../vercel-config.js';

interface Document {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    url?: string;
    title?: string;
    type?: 'web' | 'employee' | 'announcement';
    timestamp?: number;
    employee?: any;
    announcement?: any;
    source?: string;
  };
}

interface SearchResult {
  document: Document;
  similarity: number;
  content: string;
  metadata: any;
}

class VectorStoreService {
  private documents: Document[] = [];
  private isInitialized = false;
  private isVercelEnvironment = false;
  private memoryCache = new Map<string, any>();
  private config: any;

  constructor() {
    // Detectar ambiente Vercel
    this.isVercelEnvironment = vercelConfig.isVercel();
    this.config = vercelConfig.getConfig();
    
    console.log('[VectorStore] Ambiente detectado:', {
      isVercel: this.isVercelEnvironment,
      config: this.config
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[VectorStore] Já inicializado');
      return;
    }

    try {
      console.log('[VectorStore] Inicializando...');
      
      // Em produção/Vercel, não usar localStorage
      if (!this.isVercelEnvironment) {
        await this.loadFromStorage();
      }
      
      this.isInitialized = true;
      console.log('[VectorStore] ✅ Inicializado com sucesso');
      
    } catch (error) {
      console.error('[VectorStore] ❌ Erro na inicialização:', error);
      this.isInitialized = true; // Continuar mesmo com erro
    }
  }

  // Método específico para adicionar documentos web
  async addWebDocuments(documents: Array<{
    content: string;
    metadata: any;
  }>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('[VectorStore] Adicionando documentos web:', documents.length);
      
      // Aplicar limite de chunks em produção
      const maxChunks = this.config.embedding?.maxChunks || 1000;
      let totalChunks = this.documents.length;
      
      for (const doc of documents) {
        if (totalChunks >= maxChunks) {
          console.warn('[VectorStore] Limite de chunks atingido, parando adição');
          break;
        }
        
        const chunks = this.chunkText(doc.content);
        
        for (const chunk of chunks) {
          if (totalChunks >= maxChunks) break;
          
          const embedding = await this.generateEmbedding(chunk);
          const document: Document = {
            id: this.generateId(),
            content: chunk,
            embedding,
            metadata: {
              ...doc.metadata,
              type: 'web',
              timestamp: Date.now()
            }
          };
          
          this.documents.push(document);
          totalChunks++;
        }
      }
      
      // Salvar apenas em desenvolvimento
      if (!this.isVercelEnvironment) {
        await this.saveToStorage();
      }
      
      console.log('[VectorStore] ✅ Documentos web adicionados:', {
        total: this.documents.length,
        novos: documents.length
      });
      
    } catch (error) {
      console.error('[VectorStore] ❌ Erro ao adicionar documentos web:', error);
      throw error;
    }
  }

  // Método específico para adicionar dados de funcionários
  async addEmployeeData(employees: any[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('[VectorStore] Adicionando dados de funcionários:', employees.length);
      
      for (const employee of employees) {
        const content = this.formatEmployeeContent(employee);
        const embedding = await this.generateEmbedding(content);
        
        const document: Document = {
          id: this.generateId(),
          content,
          embedding,
          metadata: {
            type: 'employee',
            employee,
            timestamp: Date.now(),
            source: 'internal'
          }
        };
        
        this.documents.push(document);
      }
      
      if (!this.isVercelEnvironment) {
        await this.saveToStorage();
      }
      
      console.log('[VectorStore] ✅ Dados de funcionários adicionados');
      
    } catch (error) {
      console.error('[VectorStore] ❌ Erro ao adicionar funcionários:', error);
      throw error;
    }
  }

  // Método específico para adicionar comunicados
  async addAnnouncements(announcements: any[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('[VectorStore] Adicionando comunicados:', announcements.length);
      
      for (const announcement of announcements) {
        const content = this.formatAnnouncementContent(announcement);
        const embedding = await this.generateEmbedding(content);
        
        const document: Document = {
          id: this.generateId(),
          content,
          embedding,
          metadata: {
            type: 'announcement',
            announcement,
            timestamp: Date.now(),
            source: 'internal'
          }
        };
        
        this.documents.push(document);
      }
      
      if (!this.isVercelEnvironment) {
        await this.saveToStorage();
      }
      
      console.log('[VectorStore] ✅ Comunicados adicionados');
      
    } catch (error) {
      console.error('[VectorStore] ❌ Erro ao adicionar comunicados:', error);
      throw error;
    }
  }

  // Busca geral com priorização
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const results: SearchResult[] = [];
      
      // Buscar em todos os documentos
      for (const doc of this.documents) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        const minSimilarity = this.config.search?.minSimilarity || 0.1;
        
        if (similarity >= minSimilarity) {
          results.push({
            document: doc,
            similarity,
            content: doc.content,
            metadata: doc.metadata
          });
        }
      }
      
      // Ordenar por similaridade e priorizar dados internos
      results.sort((a, b) => {
        // Priorizar dados internos
        if (a.metadata.type !== 'web' && b.metadata.type === 'web') return -1;
        if (a.metadata.type === 'web' && b.metadata.type !== 'web') return 1;
        
        // Depois por similaridade
        return b.similarity - a.similarity;
      });
      
      const maxResults = this.config.search?.maxResults || limit;
      return results.slice(0, maxResults);
      
    } catch (error) {
      console.error('[VectorStore] ❌ Erro na busca:', error);
      return [];
    }
  }

  // Busca apenas em dados internos
  async searchInternalOnly(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const results: SearchResult[] = [];
      
      // Buscar apenas em documentos internos
      const internalDocs = this.documents.filter(doc => 
        doc.metadata.type === 'employee' || doc.metadata.type === 'announcement'
      );
      
      for (const doc of internalDocs) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        const minSimilarity = this.config.search?.minSimilarity || 0.1;
        
        if (similarity >= minSimilarity) {
          results.push({
            document: doc,
            similarity,
            content: doc.content,
            metadata: doc.metadata
          });
        }
      }
      
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
      
    } catch (error) {
      console.error('[VectorStore] ❌ Erro na busca interna:', error);
      return [];
    }
  }

  // Busca apenas em dados web
  async searchWebOnly(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const results: SearchResult[] = [];
      
      // Buscar apenas em documentos web
      const webDocs = this.documents.filter(doc => doc.metadata.type === 'web');
      
      for (const doc of webDocs) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        const minSimilarity = this.config.search?.minSimilarity || 0.1;
        
        if (similarity >= minSimilarity) {
          results.push({
            document: doc,
            similarity,
            content: doc.content,
            metadata: doc.metadata
          });
        }
      }
      
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
      
    } catch (error) {
      console.error('[VectorStore] ❌ Erro na busca web:', error);
      return [];
    }
  }

  private chunkText(text: string): string[] {
    const chunkSize = this.config.embedding?.chunkSize || 1000;
    const overlap = this.config.embedding?.overlap || 100;
    
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);

      // Tentar quebrar em uma frase completa
      if (end < text.length) {
        const lastSentence = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastSentence, lastNewline);
        
        if (breakPoint > start + chunkSize * 0.5) {
          chunk = text.slice(start, breakPoint + 1);
          start = breakPoint + 1;
        } else {
          start = end - overlap;
        }
      } else {
        start = end;
      }

      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Usar cache em memória para embeddings
      const cacheKey = `embedding_${this.hashString(text)}`;
      if (this.memoryCache.has(cacheKey)) {
        return this.memoryCache.get(cacheKey);
      }
      
      const dimensions = this.config.embedding?.dimensions || 384;
      
      // Gerar embedding otimizado
      const words = text.toLowerCase().split(/\s+/);
      const embedding = new Array(dimensions).fill(0);
      
      // Termos importantes da empresa TORP
      const companyTerms = [
        'torp', 'tecnologia', 'organização', 'recursos', 'pessoas',
        'equipe', 'colaborador', 'funcionário', 'departamento',
        'comercial', 'administrativo', 'marketing', 'ti', 'rh'
      ];
      
      // Componente de frequência de palavras
      const wordFreq = new Map<string, number>();
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
      
      // Preencher embedding
      words.forEach((word, index) => {
        const freq = wordFreq.get(word) || 1;
        const isCompanyTerm = companyTerms.includes(word);
        const boost = isCompanyTerm ? 2.0 : 1.0;
        
        for (let i = 0; i < dimensions; i++) {
          const hash = this.hashString(word + i) % 1000000;
          embedding[i] += (hash / 1000000) * freq * boost;
        }
      });
      
      // Adicionar características estatísticas
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      const uniqueWords = new Set(words).size;
      
      for (let i = 0; i < Math.min(10, dimensions); i++) {
        embedding[i] += avgWordLength * 0.1;
        embedding[i + 10] += uniqueWords * 0.01;
      }
      
      // Normalizar vetor
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        for (let i = 0; i < embedding.length; i++) {
          embedding[i] /= magnitude;
        }
      }
      
      // Armazenar no cache com limite
      if (this.memoryCache.size < (this.config.memoryCache?.maxItems || 1000)) {
        this.memoryCache.set(cacheKey, embedding);
      }
      
      return embedding;
      
    } catch (error) {
      console.error('[VectorStore] Erro ao gerar embedding:', error);
      // Retornar embedding aleatório como fallback
      const dimensions = this.config.embedding?.dimensions || 384;
      return Array.from({ length: dimensions }, () => Math.random() - 0.5);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private formatEmployeeContent(employee: any): string {
    return `${employee.name || ''} ${employee.department || ''} ${employee.position || ''} ${employee.email || ''} ${employee.phone || ''} ${employee.extension || ''}`.trim();
  }

  private formatAnnouncementContent(announcement: any): string {
    return `${announcement.title || ''} ${announcement.content || ''} ${announcement.date || ''}`.trim();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Métodos de gerenciamento
  getStats() {
    const stats = {
      totalDocuments: this.documents.length,
      documentsByType: {} as Record<string, number>,
      lastUpdated: new Date().toISOString(),
      memoryUsage: this.memoryCache.size,
      isVercelEnvironment: this.isVercelEnvironment
    };
    
    this.documents.forEach(doc => {
      const type = doc.metadata.type || 'unknown';
      stats.documentsByType[type] = (stats.documentsByType[type] || 0) + 1;
    });
    
    return stats;
  }

  clear(): void {
    this.documents = [];
    this.memoryCache.clear();
    
    // Limpar localStorage apenas em desenvolvimento
    if (!this.isVercelEnvironment && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('vectorstore_documents');
        console.log('[VectorStore] ✅ Cache limpo');
      } catch (error) {
        console.warn('[VectorStore] Erro ao limpar localStorage:', error);
      }
    }
  }

  hasData(): boolean {
    return this.documents.length > 0;
  }

  getDocument(id: string): Document | null {
    return this.documents.find(doc => doc.id === id) || null;
  }

  removeDocument(id: string): boolean {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      if (!this.isVercelEnvironment) {
        this.saveToStorage();
      }
      return true;
    }
    return false;
  }

  // Métodos de armazenamento (apenas para desenvolvimento)
  private async loadFromStorage(): Promise<void> {
    if (this.isVercelEnvironment || typeof window === 'undefined') {
      return;
    }
    
    try {
      const stored = localStorage.getItem('vectorstore_documents');
      if (stored) {
        this.documents = JSON.parse(stored);
        console.log('[VectorStore] ✅ Dados carregados do localStorage:', this.documents.length);
      }
    } catch (error) {
      console.warn('[VectorStore] Erro ao carregar do localStorage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    if (this.isVercelEnvironment || typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem('vectorstore_documents', JSON.stringify(this.documents));
      console.log('[VectorStore] ✅ Dados salvos no localStorage');
    } catch (error) {
      console.warn('[VectorStore] Erro ao salvar no localStorage:', error);
    }
  }
}

// Instância singleton
const vectorStoreService = new VectorStoreService();
export default vectorStoreService;