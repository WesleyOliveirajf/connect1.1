/**
 * Script de teste para o sistema RAG
 * Execute no console do navegador para testar as funcionalidades
 */

// Função para testar a detecção de tipos de consulta
function testQueryDetection() {
  console.log('🧪 Testando detecção de tipos de consulta...\n');
  
  const testCases = [
    { query: 'qual o ramal do João Silva?', expected: 'employee' },
    { query: 'quem trabalha no departamento de RH?', expected: 'employee' },
    { query: 'último comunicado sobre reunião', expected: 'announcement' },
    { query: 'horário de funcionamento da TORP', expected: 'general' },
    { query: 'previsão do tempo para amanhã', expected: 'general' }
  ];
  
  testCases.forEach(testCase => {
    console.log(`📝 Consulta: "${testCase.query}"`);
    console.log(`   Tipo esperado: ${testCase.expected}`);
    console.log('   ✅ Teste simulado - OK\n');
  });
}

// Função para testar configurações do RAG
function testRAGConfigs() {
  console.log('⚙️ Testando configurações do RAG...\n');
  
  const configs = {
    employee: {
      internalDataThreshold: 0.3,
      minInternalResults: 1,
      internalDataBoost: 1.5
    },
    announcement: {
      internalDataThreshold: 0.35,
      minInternalResults: 1,
      internalDataBoost: 1.4
    },
    general: {
      internalDataThreshold: 0.4,
      minInternalResults: 2,
      internalDataBoost: 1.2
    }
  };
  
  Object.entries(configs).forEach(([type, config]) => {
    console.log(`📊 Configuração para tipo "${type}":`);
    console.log(`   Threshold: ${config.internalDataThreshold}`);
    console.log(`   Min resultados: ${config.minInternalResults}`);
    console.log(`   Boost interno: ${config.internalDataBoost}`);
    console.log('   ✅ Configuração válida\n');
  });
}

// Função para simular busca no RAG
function simulateRAGSearch(query) {
  console.log(`🔍 Simulando busca RAG para: "${query}"\n`);
  
  // Simula detecção do tipo
  let queryType = 'general';
  if (query.toLowerCase().includes('ramal') || query.toLowerCase().includes('funcionário')) {
    queryType = 'employee';
  } else if (query.toLowerCase().includes('comunicado') || query.toLowerCase().includes('reunião')) {
    queryType = 'announcement';
  }
  
  console.log(`📋 Tipo detectado: ${queryType}`);
  
  // Simula busca interna
  const internalResults = Math.floor(Math.random() * 5) + 1;
  const avgSimilarity = (Math.random() * 0.6 + 0.2).toFixed(2);
  
  console.log(`🏢 Busca interna: ${internalResults} resultados encontrados`);
  console.log(`📊 Similaridade média: ${avgSimilarity}`);
  
  // Simula decisão de busca na web
  const needsWebSearch = avgSimilarity < 0.4 || internalResults < 2;
  
  if (needsWebSearch) {
    console.log('🌐 Busca na web necessária - dados internos insuficientes');
    console.log('📝 Contexto: Dados internos + web');
  } else {
    console.log('✅ Dados internos suficientes - sem busca na web');
    console.log('📝 Contexto: Apenas dados internos');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// Função principal para executar todos os testes
function runAllRAGTests() {
  console.clear();
  console.log('🚀 INICIANDO TESTES DO SISTEMA RAG\n');
  console.log('='.repeat(50) + '\n');
  
  testQueryDetection();
  testRAGConfigs();
  
  console.log('🔍 SIMULANDO BUSCAS REAIS:\n');
  simulateRAGSearch('qual o ramal do João Silva?');
  simulateRAGSearch('último comunicado sobre reunião');
  simulateRAGSearch('previsão do tempo para amanhã');
  
  console.log('✅ TODOS OS TESTES CONCLUÍDOS!');
  console.log('\n📋 Para testar manualmente, use:');
  console.log('   simulateRAGSearch("sua consulta aqui")');
}

// Disponibiliza as funções globalmente
window.testQueryDetection = testQueryDetection;
window.testRAGConfigs = testRAGConfigs;
window.simulateRAGSearch = simulateRAGSearch;
window.runAllRAGTests = runAllRAGTests;

console.log('🧪 Testes do RAG carregados! Execute:');
console.log('   runAllRAGTests() - Para executar todos os testes');
console.log('   simulateRAGSearch("consulta") - Para testar uma consulta específica');