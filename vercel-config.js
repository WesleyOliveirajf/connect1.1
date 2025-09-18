// Configuração específica para Vercel - RAG Optimization
export const vercelConfig = {
  // Detectar ambiente Vercel
  isVercel: () => {
    return typeof window !== 'undefined' && (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('vercel.com') ||
      process.env.VERCEL === '1' ||
      process.env.VERCEL_ENV !== undefined
    );
  },

  // Configurações otimizadas para produção
  production: {
    // Desabilitar localStorage para dados grandes
    useLocalStorage: false,
    
    // Usar cache em memória com limite
    memoryCache: {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxItems: 1000,
      ttl: 30 * 60 * 1000 // 30 minutos
    },
    
    // Configurações de scraping otimizadas
    scraping: {
      maxPages: 10, // Reduzido para produção
      timeout: 15000, // 15 segundos
      retries: 2,
      concurrent: 2, // Máximo 2 páginas simultâneas
      respectRobots: true,
      userAgent: 'TorpBot/1.0 (+https://torp.com.br)'
    },
    
    // Configurações de embedding otimizadas
    embedding: {
      dimensions: 384,
      chunkSize: 500, // Chunks menores
      overlap: 50,
      maxChunks: 500 // Limite de chunks
    },
    
    // Configurações de busca
    search: {
      maxResults: 5,
      minSimilarity: 0.2, // Mais restritivo
      contextMaxLength: 1500 // Menor para economizar tokens
    }
  },

  // Configurações para desenvolvimento
  development: {
    useLocalStorage: true,
    
    scraping: {
      maxPages: 20,
      timeout: 30000,
      retries: 3,
      concurrent: 5
    },
    
    embedding: {
      dimensions: 384,
      chunkSize: 1000,
      overlap: 100,
      maxChunks: 1000
    },
    
    search: {
      maxResults: 10,
      minSimilarity: 0.1,
      contextMaxLength: 2000
    }
  },

  // Obter configuração baseada no ambiente
  getConfig: function() {
    return this.isVercel() ? this.production : this.development;
  },

  // Verificar se deve usar fallbacks
  shouldUseFallbacks: function() {
    return this.isVercel() || process.env.NODE_ENV === 'production';
  },

  // Configurações de logs para produção
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    enableConsole: process.env.NODE_ENV !== 'production',
    enablePerformance: true
  }
};

export default vercelConfig;