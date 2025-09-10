/**
 * Serviço para comunicação com webhook do N8n
 * Gerencia o envio de mensagens e recebimento de respostas do chatbot
 */

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
}

export interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

class N8nService {
  private readonly webhookUrl: string;
  private readonly timeout: number;

  constructor() {
    this.webhookUrl = 'https://htilgpmp8nfo2qm4u4be2mfu.n8nready.com.br/webhook-test/3ab7a16a-174f-4bc1-a8be-2f9ad03dac86';
    this.timeout = 30000; // 30 segundos
  }

  /**
   * Envia mensagem para o webhook do N8n
   */
  async sendMessage(message: string, userId?: string): Promise<N8nWebhookResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const payload = {
        message: message.trim(),
        userId: userId || this.generateUserId(),
        timestamp: new Date().toISOString(),
        source: 'torp-connect-chatbot'
      };

      console.log('[N8n Service] Enviando mensagem:', payload);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[N8n Service] Resposta recebida:', data);

      return {
        success: true,
        message: data.message || data.response || 'Resposta recebida com sucesso',
        data: data
      };

    } catch (error) {
      console.error('[N8n Service] Erro ao enviar mensagem:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Timeout: A resposta demorou muito para chegar. Tente novamente.'
          };
        }
        
        return {
          success: false,
          error: `Erro de comunicação: ${error.message}`
        };
      }

      return {
        success: false,
        error: 'Erro desconhecido ao processar sua mensagem'
      };
    }
  }

  /**
   * Testa a conectividade com o webhook
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendMessage('test', 'health-check');
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Gera um ID único para o usuário
   */
  private generateUserId(): string {
    const stored = localStorage.getItem('torp-chatbot-user-id');
    if (stored) {
      return stored;
    }

    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('torp-chatbot-user-id', newId);
    return newId;
  }

  /**
   * Limpa o cache do usuário
   */
  clearUserSession(): void {
    localStorage.removeItem('torp-chatbot-user-id');
  }
}

// Instância singleton
export const n8nService = new N8nService();
export default n8nService;