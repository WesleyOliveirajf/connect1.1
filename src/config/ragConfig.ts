/**
 * Configurações do sistema RAG
 * Controla o comportamento de priorização de dados internos vs web
 */

export interface RAGSearchConfig {
  // Threshold para considerar resultados internos como "suficientes"
  internalDataThreshold: number;
  
  // Número mínimo de resultados internos para evitar busca na web
  minInternalResults: number;
  
  // Boost para dados internos vs dados da web
  internalDataBoost: number;
  
  // Limite de resultados para busca interna
  internalSearchLimit: number;
  
  // Limite de resultados para busca na web (fallback)
  webSearchLimit: number;
  
  // Similaridade mínima para considerar um resultado relevante
  minSimilarity: number;
}

export const DEFAULT_RAG_CONFIG: RAGSearchConfig = {
  // Threshold de 0.4 significa que se encontrar resultados internos com similaridade > 40%, não busca na web
  internalDataThreshold: 0.4,
  
  // Precisa de pelo menos 1 resultado interno relevante para evitar busca na web
  minInternalResults: 1,
  
  // Dados internos recebem boost de 50% na pontuação
  internalDataBoost: 1.5,
  
  // Busca até 10 resultados internos primeiro
  internalSearchLimit: 10,
  
  // Se precisar buscar na web, busca até 15 resultados
  webSearchLimit: 15,
  
  // Similaridade mínima de 10% para considerar relevante
  minSimilarity: 0.1
};

/**
 * Configurações específicas por tipo de consulta
 */
export const QUERY_TYPE_CONFIGS: Record<string, Partial<RAGSearchConfig>> = {
  // Para consultas sobre funcionários, seja mais rigoroso
  employee: {
    internalDataThreshold: 0.3, // Threshold menor para funcionários
    minInternalResults: 1,
    internalDataBoost: 2.0, // Boost maior para dados de funcionários
  },
  
  // Para comunicados, também priorize dados internos
  announcement: {
    internalDataThreshold: 0.35,
    minInternalResults: 1,
    internalDataBoost: 1.8,
  },
  
  // Para consultas gerais, seja mais flexível
  general: {
    internalDataThreshold: 0.4,
    minInternalResults: 1,
    internalDataBoost: 1.3,
  }
};

/**
 * Detecta o tipo de consulta baseado nas palavras-chave
 */
export function detectQueryType(query: string): keyof typeof QUERY_TYPE_CONFIGS {
  const queryLower = query.toLowerCase();
  
  // Termos relacionados a funcionários
  const employeeTerms = ['funcionario', 'funcionária', 'ramal', 'extensao', 'email', 'departamento', 'setor', 'colaborador'];
  if (employeeTerms.some(term => queryLower.includes(term))) {
    return 'employee';
  }
  
  // Termos relacionados a comunicados
  const announcementTerms = ['comunicado', 'aviso', 'anuncio', 'informativo', 'reuniao', 'treinamento'];
  if (announcementTerms.some(term => queryLower.includes(term))) {
    return 'announcement';
  }
  
  return 'general';
}

/**
 * Obtém configuração otimizada para um tipo de consulta
 */
export function getConfigForQuery(query: string): RAGSearchConfig {
  const queryType = detectQueryType(query);
  const typeConfig = QUERY_TYPE_CONFIGS[queryType] || {};
  
  return {
    ...DEFAULT_RAG_CONFIG,
    ...typeConfig
  };
}