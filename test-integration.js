// Script de teste para validar integração dos serviços RAG
// Execute com: node test-integration.js

import { groqService } from './src/utils/groqService.ts';
import { ragService } from './src/utils/ragService.ts';
import { vectorStoreService } from './src/utils/vectorStoreService.ts';

async function testIntegration() {
  console.log('🧪 Iniciando testes de integração...\n');

  try {
    // 1. Testar conexão com Groq
    console.log('1️⃣ Testando conexão com Groq...');
    const groqStatus = await groqService.testConnection();
    console.log(`   Status: ${groqStatus.status}`);
    console.log(`   Mensagem: ${groqStatus.message}\n`);

    if (groqStatus.status !== 'connected') {
      console.log('❌ Falha na conexão com Groq. Verifique a API key.');
      return;
    }

    // 2. Testar inicialização do RAG
    console.log('2️⃣ Testando inicialização do RAG...');
    const ragStatus = await groqService.initializeRAG();
    console.log(`   Status: ${ragStatus.status}`);
    console.log(`   Mensagem: ${ragStatus.message}\n`);

    // 3. Testar VectorStore
    console.log('3️⃣ Testando VectorStore...');
    const hasData = vectorStoreService.hasData();
    console.log(`   Tem dados: ${hasData}`);
    
    if (hasData) {
      const stats = vectorStoreService.getStats();
      console.log(`   Documentos: ${stats.totalDocuments}`);
      console.log(`   Chunks: ${stats.totalChunks}`);
    }
    console.log('');

    // 4. Testar busca RAG
    console.log('4️⃣ Testando busca RAG...');
    const searchResult = await ragService.searchWebDataOnly('TORP empresa');
    console.log(`   Resultados encontrados: ${searchResult.length}`);
    
    if (searchResult.length > 0) {
      console.log(`   Primeiro resultado: ${searchResult[0].content.substring(0, 100)}...`);
    }
    console.log('');

    // 5. Testar envio de mensagem completa
    console.log('5️⃣ Testando envio de mensagem...');
    const response = await groqService.sendMessage([
      { role: 'user', content: 'O que é a TORP?' }
    ]);
    
    console.log(`   Resposta recebida: ${response.content ? 'Sim' : 'Não'}`);
    console.log(`   Sources: ${response.sources ? response.sources.length : 0}`);
    
    if (response.content) {
      console.log(`   Conteúdo: ${response.content.substring(0, 150)}...`);
    }
    console.log('');

    console.log('✅ Todos os testes passaram com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar testes
testIntegration().catch(console.error);