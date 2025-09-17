/**
 * Script de teste para diagnosticar problemas de conectividade com Groq
 */

import groqService from './groqService';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
}

class GroqConnectionTester {
  private results: TestResult[] = [];

  private addResult(test: string, success: boolean, message: string, details?: any) {
    this.results.push({ test, success, message, details });
    console.log(`[${success ? '✅' : '❌'}] ${test}: ${message}`, details || '');
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🔍 Iniciando diagnóstico completo do Groq...\n');
    
    await this.testEnvironmentVariables();
    await this.testServiceConfiguration();
    await this.testAPIConnection();
    await this.testMessageSending();
    
    console.log('\n📊 Resumo dos testes:');
    this.results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.test}`);
    });
    
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log('\n🚨 Problemas encontrados:');
      failedTests.forEach(test => {
        console.log(`- ${test.test}: ${test.message}`);
      });
    } else {
      console.log('\n🎉 Todos os testes passaram! Groq está funcionando corretamente.');
    }
    
    return this.results;
  }

  private async testEnvironmentVariables() {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      this.addResult(
        'Variáveis de Ambiente',
        false,
        'VITE_GROQ_API_KEY não encontrada',
        { 
          expected: 'VITE_GROQ_API_KEY=gsk_...',
          found: 'undefined'
        }
      );
      return;
    }

    if (!apiKey.startsWith('gsk_')) {
      this.addResult(
        'Variáveis de Ambiente',
        false,
        'Formato da API Key inválido',
        { 
          expected: 'Deve começar com "gsk_"',
          found: `Começa com "${apiKey.substring(0, 4)}"`
        }
      );
      return;
    }

    if (apiKey.length < 50) {
      this.addResult(
        'Variáveis de Ambiente',
        false,
        'API Key muito curta',
        { 
          expected: 'Pelo menos 50 caracteres',
          found: `${apiKey.length} caracteres`
        }
      );
      return;
    }

    this.addResult(
      'Variáveis de Ambiente',
      true,
      'API Key configurada corretamente',
      { 
        prefix: apiKey.substring(0, 10) + '...',
        length: apiKey.length
      }
    );
  }

  private async testServiceConfiguration() {
    try {
      const isConfigured = groqService.isConfigured();
      const model = groqService.getModel();
      
      if (!isConfigured) {
        this.addResult(
          'Configuração do Serviço',
          false,
          'Serviço não está configurado',
          { isConfigured, model }
        );
        return;
      }

      this.addResult(
        'Configuração do Serviço',
        true,
        'Serviço configurado corretamente',
        { isConfigured, model }
      );
    } catch (error) {
      this.addResult(
        'Configuração do Serviço',
        false,
        'Erro ao verificar configuração',
        { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      );
    }
  }

  private async testAPIConnection() {
    try {
      console.log('🔗 Testando conexão com API Groq...');
      const startTime = Date.now();
      
      const isConnected = await groqService.testConnection();
      const duration = Date.now() - startTime;
      
      if (isConnected) {
        this.addResult(
          'Conexão com API',
          true,
          'Conexão estabelecida com sucesso',
          { duration: `${duration}ms` }
        );
      } else {
        this.addResult(
          'Conexão com API',
          false,
          'Falha na conexão com a API',
          { duration: `${duration}ms` }
        );
      }
    } catch (error) {
      this.addResult(
        'Conexão com API',
        false,
        'Erro durante teste de conexão',
        { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      );
    }
  }

  private async testMessageSending() {
    try {
      console.log('💬 Testando envio de mensagem...');
      const startTime = Date.now();
      
      const response = await groqService.sendMessage(
        'Responda apenas com "OK" se você estiver funcionando.',
        [],
        { useRAG: false } // Desabilitar RAG para teste simples
      );
      
      const duration = Date.now() - startTime;
      
      if (response && response.length > 0) {
        this.addResult(
          'Envio de Mensagem',
          true,
          'Mensagem enviada e resposta recebida',
          { 
            duration: `${duration}ms`,
            responseLength: response.length,
            responsePreview: response.substring(0, 50) + (response.length > 50 ? '...' : '')
          }
        );
      } else {
        this.addResult(
          'Envio de Mensagem',
          false,
          'Resposta vazia ou inválida',
          { duration: `${duration}ms`, response }
        );
      }
    } catch (error) {
      this.addResult(
        'Envio de Mensagem',
        false,
        'Erro ao enviar mensagem',
        { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      );
    }
  }
}

// Função para executar os testes
export async function testGroqConnection(): Promise<TestResult[]> {
  const tester = new GroqConnectionTester();
  return await tester.runAllTests();
}

// Função para executar teste rápido
export async function quickGroqTest(): Promise<boolean> {
  try {
    console.log('⚡ Teste rápido do Groq...');
    const isConnected = await groqService.testConnection();
    console.log(`Resultado: ${isConnected ? '✅ Conectado' : '❌ Desconectado'}`);
    return isConnected;
  } catch (error) {
    console.error('❌ Erro no teste rápido:', error);
    return false;
  }
}

export default GroqConnectionTester;