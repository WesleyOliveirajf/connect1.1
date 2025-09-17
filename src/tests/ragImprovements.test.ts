/**
 * Testes para validar as melhorias implementadas no RAG Service
 * Este arquivo contém cenários de teste para verificar se o sistema
 * está retornando informações mais precisas dos dados da aplicação
 */

import { RAGService } from '../utils/ragService';

// Dados de teste simulando funcionários
const mockEmployees = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao.silva@empresa.com',
    department: 'Tecnologia',
    position: 'Desenvolvedor Senior',
    phone: '(11) 99999-9999',
    startDate: '2023-01-15'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@empresa.com',
    department: 'Recursos Humanos',
    position: 'Analista de RH',
    phone: '(11) 88888-8888',
    startDate: '2022-06-10'
  }
];

// Dados de teste simulando comunicados
const mockAnnouncements = [
  {
    id: '1',
    title: 'Nova política de home office',
    content: 'A partir de segunda-feira, todos os funcionários poderão trabalhar em home office 2 dias por semana.',
    date: '2024-01-15',
    priority: 'high',
    department: 'Geral'
  },
  {
    id: '2',
    title: 'Treinamento de segurança',
    content: 'Será realizado um treinamento obrigatório sobre segurança da informação na próxima sexta-feira.',
    date: '2024-01-10',
    priority: 'medium',
    department: 'Tecnologia'
  }
];

/**
 * Cenários de teste para validar as melhorias do RAG
 */
export const testScenarios = [
  {
    name: 'Busca por funcionário específico',
    query: 'Quem é João Silva?',
    expectedContext: ['João Silva', 'Desenvolvedor Senior', 'Tecnologia'],
    description: 'Deve retornar informações precisas sobre o funcionário João Silva'
  },
  {
    name: 'Busca por departamento',
    query: 'Quem trabalha no departamento de Tecnologia?',
    expectedContext: ['João Silva', 'Tecnologia', 'Desenvolvedor'],
    description: 'Deve listar funcionários do departamento de Tecnologia'
  },
  {
    name: 'Busca por comunicados recentes',
    query: 'Quais são os comunicados mais recentes?',
    expectedContext: ['home office', 'treinamento', 'segurança'],
    description: 'Deve retornar comunicados ordenados por relevância e data'
  },
  {
    name: 'Busca por política específica',
    query: 'Como funciona a nova política de home office?',
    expectedContext: ['home office', '2 dias por semana', 'segunda-feira'],
    description: 'Deve retornar detalhes específicos da política de home office'
  },
  {
    name: 'Busca por contato de funcionário',
    query: 'Qual o telefone da Maria Santos?',
    expectedContext: ['Maria Santos', '(11) 88888-8888', 'Recursos Humanos'],
    description: 'Deve retornar informações de contato específicas'
  },
  {
    name: 'Busca por treinamentos',
    query: 'Há algum treinamento programado?',
    expectedContext: ['treinamento', 'segurança', 'sexta-feira', 'obrigatório'],
    description: 'Deve encontrar informações sobre treinamentos programados'
  }
];

/**
 * Função para simular dados no localStorage
 */
export function setupMockData() {
  // Simula dados de funcionários no localStorage
  localStorage.setItem('employees', JSON.stringify(mockEmployees));
  
  // Simula dados de comunicados no localStorage
  localStorage.setItem('announcements', JSON.stringify(mockAnnouncements));
}

/**
 * Função para executar testes manuais
 * Execute esta função no console do navegador para testar as melhorias
 */
export async function runRAGTests() {
  console.log('🚀 Iniciando testes das melhorias do RAG Service...\n');
  
  // Configura dados de teste
  setupMockData();
  
  // Inicializa o RAG Service
  const ragService = new RAGService({
    maxResults: 10,
    similarityThreshold: 0.3,
    chunkSize: 500,
    chunkOverlap: 50
  });
  
  await ragService.initialize();
  
  // Executa cada cenário de teste
  for (const scenario of testScenarios) {
    console.log(`📋 Testando: ${scenario.name}`);
    console.log(`❓ Query: "${scenario.query}"`);
    console.log(`📝 Descrição: ${scenario.description}`);
    
    try {
      const context = await ragService.searchContext(scenario.query);
      
      console.log('✅ Contexto retornado:');
      console.log(context);
      
      // Verifica se os termos esperados estão presentes
      const contextText = context.toLowerCase();
      const foundTerms = scenario.expectedContext.filter(term => 
        contextText.includes(term.toLowerCase())
      );
      
      console.log(`🎯 Termos encontrados: ${foundTerms.length}/${scenario.expectedContext.length}`);
      console.log(`📊 Precisão: ${(foundTerms.length / scenario.expectedContext.length * 100).toFixed(1)}%`);
      
      if (foundTerms.length === scenario.expectedContext.length) {
        console.log('✅ TESTE PASSOU - Todos os termos esperados foram encontrados');
      } else {
        console.log('⚠️ TESTE PARCIAL - Alguns termos não foram encontrados');
        console.log(`❌ Termos faltantes: ${scenario.expectedContext.filter(term => !foundTerms.includes(term))}`);
      }
      
    } catch (error) {
      console.error('❌ ERRO no teste:', error);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  console.log('🏁 Testes concluídos!');
}

// Exporta função para uso no console
(window as any).runRAGTests = runRAGTests;
(window as any).setupMockData = setupMockData;

console.log('📚 Arquivo de testes carregado!');
console.log('💡 Para executar os testes, digite no console: runRAGTests()');