/**
 * Testes para validar a priorização de dados internos no sistema RAG
 */

import RAGService from '../utils/ragService';
import { getConfigForQuery, detectQueryType } from '../config/ragConfig';

// Função para testar o comportamento do RAG
export async function testRAGPrioritization() {
  console.log('🧪 Iniciando testes de priorização do RAG...\n');
  
  // Casos de teste
  const testCases = [
    {
      name: 'Consulta sobre funcionário específico',
      query: 'qual o ramal do João Silva?',
      expectedType: 'employee',
      shouldPrioritizeInternal: true
    },
    {
      name: 'Consulta sobre departamento',
      query: 'quem trabalha no departamento de RH?',
      expectedType: 'employee',
      shouldPrioritizeInternal: true
    },
    {
      name: 'Consulta sobre comunicado',
      query: 'último comunicado sobre reunião',
      expectedType: 'announcement',
      shouldPrioritizeInternal: true
    },
    {
      name: 'Consulta geral sobre empresa',
      query: 'horário de funcionamento da TORP',
      expectedType: 'general',
      shouldPrioritizeInternal: true
    },
    {
      name: 'Consulta externa (deve buscar na web)',
      query: 'previsão do tempo para amanhã',
      expectedType: 'general',
      shouldPrioritizeInternal: false
    }
  ];
  
  // Testa detecção de tipo de consulta
  console.log('📋 Testando detecção de tipos de consulta:');
  testCases.forEach(testCase => {
    const detectedType = detectQueryType(testCase.query);
    const config = getConfigForQuery(testCase.query);
    
    console.log(`  ✓ "${testCase.query}"`);
    console.log(`    Tipo detectado: ${detectedType} (esperado: ${testCase.expectedType})`);
    console.log(`    Threshold: ${config.internalDataThreshold}`);
    console.log(`    Boost interno: ${config.internalDataBoost}x`);
    console.log('');
  });
  
  return testCases;
}

// Função para testar com RAG Service real (se disponível)
export async function testRAGServiceBehavior() {
  console.log('🔍 Testando comportamento do RAG Service...\n');
  
  try {
    // Configuração básica para teste
    const ragConfig = {
      websiteUrl: import.meta.env.VITE_RAG_WEBSITE_URL || '',
      searchLimit: 5,
      minSimilarity: 0.1,
      contextMaxLength: 2000
    };
    
    if (!ragConfig.websiteUrl) {
      console.log('⚠️ URL do site não configurada. Pulando testes do RAG Service.');
      return;
    }
    
    const ragService = new RAGService(ragConfig);
    await ragService.initialize();
    
    // Testes com consultas reais
    const queries = [
      'funcionários do departamento de TI',
      'comunicado sobre horário de almoço',
      'informações sobre a empresa TORP'
    ];
    
    for (const query of queries) {
      console.log(`🔍 Testando: "${query}"`);
      
      try {
        const context = await ragService.searchContext(query);
        
        console.log(`  📊 Resultados encontrados: ${context.totalSources}`);
        console.log(`  🌐 Precisou buscar na web: ${context.needsWebSearch ? 'Sim' : 'Não'}`);
        console.log(`  📈 Resultados internos: ${context.internalResultsCount || 0}`);
        console.log(`  ⏱️ Tempo de busca: ${context.searchTime}ms`);
        console.log('');
        
      } catch (error) {
        console.log(`  ❌ Erro: ${error}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.log(`❌ Erro ao inicializar RAG Service: ${error}`);
  }
}

// Função principal para executar todos os testes
export async function runRAGTests() {
  console.log('🚀 TESTES DE PRIORIZAÇÃO DO RAG\n');
  console.log('='.repeat(50));
  
  // Testa configurações
  await testRAGPrioritization();
  
  console.log('='.repeat(50));
  
  // Testa comportamento real
  await testRAGServiceBehavior();
  
  console.log('='.repeat(50));
  console.log('✅ Testes concluídos!\n');
  
  console.log('💡 Para testar manualmente:');
  console.log('1. Faça perguntas sobre funcionários (ex: "ramal do João")');
  console.log('2. Faça perguntas sobre comunicados (ex: "último comunicado")');
  console.log('3. Faça perguntas externas (ex: "previsão do tempo")');
  console.log('4. Observe no console se está priorizando dados internos');
}

// Exporta para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).runRAGTests = runRAGTests;
  (window as any).testRAGPrioritization = testRAGPrioritization;
  (window as any).testRAGServiceBehavior = testRAGServiceBehavior;
}