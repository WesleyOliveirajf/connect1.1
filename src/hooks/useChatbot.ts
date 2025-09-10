import { useState, useCallback, useRef, useEffect } from 'react';
import groqService, { type GroqMessage } from '@/utils/groqService';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
}

export interface UseChatbotReturn {
  // Estado
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isConnected: boolean;
  
  // Ações
  sendMessage: (content: string) => Promise<void>;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  clearMessages: () => void;
  
  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const STORAGE_KEY = 'torp-chatbot-messages';
const MAX_MESSAGES = 100;

export const useChatbot = (): UseChatbotReturn => {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Estados
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((msg: { id: string; content: string; sender: 'user' | 'bot'; timestamp: string; isLoading?: boolean }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.warn('[useChatbot] Erro ao carregar mensagens do localStorage:', error);
    }
    return [];
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Salvar mensagens no localStorage
  const saveMessages = useCallback((newMessages: ChatMessage[]) => {
    try {
      // Manter apenas as últimas MAX_MESSAGES mensagens
      const messagesToSave = newMessages.slice(-MAX_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.warn('[useChatbot] Erro ao salvar mensagens:', error);
    }
  }, []);

  // Gerar ID único para mensagem
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Scroll automático para o final
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Testar conexão inicial
  const testConnection = useCallback(async () => {
    try {
      const isConnected = await groqService.testConnection();
      setIsConnected(isConnected);
      
      if (!isConnected) {
        toast({
          title: "Conexão com Groq",
          description: "Não foi possível conectar à API da Groq. Verifique sua chave de API.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setIsConnected(false);
    }
  }, [toast]);

  // Enviar mensagem
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    // Adicionar mensagem do usuário
    setMessages(prev => {
      const updated = [...prev, userMessage];
      saveMessages(updated);
      return updated;
    });

    // Criar mensagem de loading do bot
    const loadingMessage: ChatMessage = {
      id: generateMessageId(),
      content: 'Digitando...',
      sender: 'bot',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => {
      const updated = [...prev, loadingMessage];
      return updated;
    });

    setIsLoading(true);
    scrollToBottom();

    try {
        // Preparar histórico da conversa para Groq
        const conversationHistory: GroqMessage[] = messages
          .filter(msg => !msg.isLoading)
          .slice(-10) // Últimas 10 mensagens para contexto
          .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));

        // Enviar para Groq
        const response = await groqService.sendMessage(content, conversationHistory);
        
        // Remover mensagem de loading e adicionar resposta
         setMessages(prev => {
           const withoutLoading = prev.filter(msg => !msg.isLoading);
           
           const botMessage: ChatMessage = {
             id: generateMessageId(),
             content: response,
             sender: 'bot',
             timestamp: new Date()
           };
           
           const updated = [...withoutLoading, botMessage];
           saveMessages(updated);
           return updated;
         });

        setIsConnected(true);

    } catch (error) {
      console.error('[useChatbot] Erro ao enviar mensagem:', error);
      
      // Remover mensagem de loading e adicionar erro
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => msg.id !== loadingMessage.id);
        
        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
          sender: 'bot',
          timestamp: new Date()
        };

        const updated = [...withoutLoading, errorMessage];
        saveMessages(updated);
        return updated;
      });

      setIsConnected(false);
      toast({
        title: "Erro",
        description: "Falha na comunicação com o chatbot",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [isLoading, generateMessageId, saveMessages, scrollToBottom, toast]);

  // Controles do chat
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Histórico Limpo",
      description: "Todas as mensagens foram removidas"
    });
  }, [toast]);

  // Scroll automático quando abrir o chat
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom]);

  // Teste de conexão inicial
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  // Mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'Olá! Sou o Oráculo, seu assistente inteligente da TORP. Como posso ajudá-lo hoje?',
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      saveMessages([welcomeMessage]);
    }
  }, [messages.length, generateMessageId, saveMessages]);

  return {
    // Estado
    messages,
    isOpen,
    isLoading,
    isConnected,
    
    // Ações
    sendMessage,
    toggleChat,
    openChat,
    closeChat,
    clearMessages,
    
    // Refs
    messagesEndRef
  };
};

export default useChatbot;