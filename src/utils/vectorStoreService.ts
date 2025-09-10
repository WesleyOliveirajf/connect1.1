/**
 * Serviço de Vector Store para sistema RAG
 * Gerencia vetorização e armazenamento de conteúdo para busca semântica
 */

import type { ScrapedContent } from './webScrapingService';

export type DocumentMetadata = {
  type: 'web' | 'employee';
} & (
  | { // Web metadata
      type: 'web';
      url: string;
      title: string;
      chunkIndex: number;
      totalChunks: number;
      wordCount: number;
      scrapedAt: string;
    }
  | { // Employee metadata
      type: 'employee';
      name: string;
      department: string;
      updatedAt: string;
    }
);

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: DocumentMetadata;
}
export interface SearchResult {
  document: VectorDocument;
  similarity: number;
}

class VectorStoreService {
  private documents: Map<string, VectorDocument> = new Map();
  private isInitialized = false;

  /**
   * Inicializa o serviço
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Carrega documentos do localStorage se existirem
    this.loadFromStorage();
    this.isInitialized = true;
    
    console.log('VectorStoreService inicializado');
  }

  /**
   * Divide texto em chunks menores para melhor processamento
   */
  private chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += maxChunkSize - overlap) {
      const chunk = words.slice(i, i + maxChunkSize).join(' ');
      if (chunk.trim().length > 50) { // Só inclui chunks com conteúdo significativo
        chunks.push(chunk.trim());
      }
    }
    
    if (chunks.length > 0) {
      return chunks;
    }
    return [text]; // Fallback para texto original
  }

  /**
   * Gera embedding simples usando hash e características do texto
   * Nota: Em produção, usar um serviço de embedding real como OpenAI ou Cohere
   */
  private generateEmbedding(text: string): number[] {
    const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = cleanText.split(/\s+/).filter(w => w.length > 2);
    
    // Cria um vetor de 384 dimensões (tamanho comum para embeddings)
    const embedding = new Array(384).fill(0);
    
    // Características baseadas em palavras
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Preenche embedding com características do texto
    let index = 0;
    
    // Frequência de palavras (primeiras 100 dimensões)
    for (const [word, freq] of Array.from(wordFreq.entries()).slice(0, 100)) {
      if (index < 100) {
        embedding[index] = Math.log(freq + 1) / Math.log(words.length + 1);
        index++;
      }
    }
    
    // Características estatísticas (próximas 50 dimensões)
    if (index < 150) {
      embedding[index++] = words.length / 1000; // Comprimento normalizado
      embedding[index++] = wordFreq.size / words.length; // Diversidade lexical
      embedding[index++] = (text.match(/[.!?]/g) || []).length / words.length; // Densidade de pontuação
      embedding[index++] = (text.match(/[A-Z]/g) || []).length / text.length; // Densidade de maiúsculas
      embedding[index++] = (text.match(/\d/g) || []).length / text.length; // Densidade numérica
    }
    
    // Hash-based features (dimensões restantes)
    for (let i = index; i < 384; i++) {
      let hash = 0;
      const str = text + i.toString();
      for (let j = 0; j < str.length; j++) {
        const char = str.charCodeAt(j);
        hash = ((hash << 5) - hash) + char;
        hash &= hash; // Convert to 32-bit integer
      }
      embedding[i] = (hash % 1000) / 1000; // Normaliza entre 0 e 1
    }
    
    // Normaliza o vetor
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    return embedding;
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
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
    if (magnitude > 0) {
      return dotProduct / magnitude;
    }
    return 0;
  }

  /**
   * Adiciona documentos ao vector store
   */
  async addDocuments(scrapedContent: ScrapedContent[]): Promise<void> {
    console.log(`Adicionando ${scrapedContent.length} documentos ao vector store`);
    
    for (const content of scrapedContent) {
      const chunks = this.chunkText(content.content);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = this.generateEmbedding(chunk);
        
        const document: VectorDocument = {
          id: `${content.url}#chunk-${i}`,
          content: chunk,
          embedding,
          metadata: {
            url: content.url,
            title: content.title,
            chunkIndex: i,
            totalChunks: chunks.length,
            wordCount: chunk.split(/\s+/).length,
            scrapedAt: content.metadata.scrapedAt
          }
        };
        
        this.documents.set(document.id, document);
      }
    }
    
    // Salva no localStorage
    this.saveToStorage();
    
    console.log(`Vector store atualizado: ${this.documents.size} chunks indexados`);
  }

  /**
   * Busca documentos similares
   */
  async searchSimilar(query: string, limit: number = 5, minSimilarity: number = 0.1): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.documents.size === 0) {
      console.warn('Vector store vazio. Execute o scraping primeiro.');
      return [];
    }
    
    const queryEmbedding = this.generateEmbedding(query);
    const results: SearchResult[] = [];
    
    for (const document of this.documents.values()) {
      const similarity = this.cosineSimilarity(queryEmbedding, document.embedding);
      
      if (similarity >= minSimilarity) {
        results.push({ document, similarity });
      }
    }
    
    // Ordena por similaridade (maior primeiro)
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, limit);
  }

  /**
   * Busca por palavras-chave
   */
  async searchByKeywords(keywords: string[], limit: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const results: SearchResult[] = [];
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    
    for (const document of this.documents.values()) {
      const content = document.content.toLowerCase();
      let score = 0;
      
      // Conta ocorrências de palavras-chave
      for (const keyword of keywordSet) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      if (score > 0) {
        // Normaliza score baseado no comprimento do documento
        const normalizedScore = score / document.content.split(/\s+/).length;
        results.push({ document, similarity: normalizedScore });
      }
    }
    
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Busca híbrida (semântica + palavras-chave)
   */
  async hybridSearch(query: string, limit: number = 5): Promise<SearchResult[]> {
    const [semanticResults, keywordResults] = await Promise.all([
      this.searchSimilar(query, limit * 2),
      this.searchByKeywords(query.split(/\s+/), limit * 2)
    ]);
    
    // Combina resultados com pesos
    const combinedResults = new Map<string, SearchResult>();
    
    // Adiciona resultados semânticos (peso 0.7)
    for (const result of semanticResults) {
      combinedResults.set(result.document.id, {
        document: result.document,
        similarity: result.similarity * 0.7
      });
    }
    
    // Adiciona/combina resultados de palavras-chave (peso 0.3)
    for (const result of keywordResults) {
      const existing = combinedResults.get(result.document.id);
      if (existing) {
        existing.similarity += result.similarity * 0.3;
      } else {
        combinedResults.set(result.document.id, {
          document: result.document,
          similarity: result.similarity * 0.3
        });
      }
    }
    
    const finalResults = Array.from(combinedResults.values());
    finalResults.sort((a, b) => b.similarity - a.similarity);
    
    return finalResults.slice(0, limit);
  }

  /**
   * Obtém estatísticas do vector store
   */
  getStats(): {
    totalDocuments: number;
    totalUrls: number;
    avgChunksPerUrl: number;
    lastUpdated: string | null;
  } {
    const urls = new Set<string>();
    let lastUpdated: string | null = null;
    
    for (const doc of this.documents.values()) {
      urls.add(doc.metadata.url);
      if (!lastUpdated || doc.metadata.scrapedAt > lastUpdated) {
        lastUpdated = doc.metadata.scrapedAt;
      }
    }
    
    return {
      totalDocuments: this.documents.size,
      totalUrls: urls.size,
      avgChunksPerUrl: urls.size > 0 ? this.documents.size / urls.size : 0,
      lastUpdated
    };
  }

  /**
   * Limpa o vector store
   */
  clear(): void {
    this.documents.clear();
    localStorage.removeItem('oraculo_vector_store');
    console.log('Vector store limpo');
  }

  /**
   * Salva dados no localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        documents: Array.from(this.documents.entries()),
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('oraculo_vector_store', JSON.stringify(data));
    } catch (error) {
      console.warn('Erro ao salvar vector store:', error);
    }
  }

  /**
   * Carrega dados do localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('oraculo_vector_store');
      if (stored) {
        const data = JSON.parse(stored);
        this.documents = new Map(data.documents);
        console.log(`Vector store carregado: ${this.documents.size} documentos`);
      }
    } catch (error) {
      console.warn('Erro ao carregar vector store:', error);
      this.documents.clear();
    }
  }

  /**
   * Adiciona documentos internos (não web)
   */
  async addInternalDocuments(docs: Array<{id: string; content: string; metadata: Omit<DocumentMetadata, 'type'> & {type: 'employee'}}>): Promise<void> {
    for (const doc of docs) {
      const chunks = this.chunkText(doc.content);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = this.generateEmbedding(chunk);
        const fullMetadata: DocumentMetadata = {
          type: doc.metadata.type,
          ...doc.metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
          wordCount: chunk.split(/\s+/).length,
        };
        const document: VectorDocument = {
          id: `${doc.id}#chunk-${i}`,
          content: chunk,
          embedding,
          metadata: fullMetadata
        };
        this.documents.set(document.id, document);
      }
    }
    this.saveToStorage();
  }
}

export default VectorStoreService;