import { useState, useCallback, useRef, useEffect } from 'react';
import groqService, { type GroqMessage } from '@/utils/groqService';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
  sources?: Array<{
    type: string;
    content: string;
    similarity: number;
    metadata: any;
  }>;
}

export interface UseChatbotReturn {
  // Estado
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isConnected: boolean;
  ragStatus: 'initializing' | 'ready' | 'error' | 'disabled';
  
  // Ações
  sendMessage: (content: string) => Promise<void>;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  clearMessages: () => void;
  initializeRAG: () => Promise<void>;
  
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
        return parsed.map((msg: { id: string; content: string; sender: 'user' | 'bot'; timestamp: string; isLoading?: boolean; sources?: any[] }) => ({
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
  const [ragStatus, setRagStatus] = useState<'initializing' | 'ready' | 'error' | 'disabled'>('initializing');

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

  // Inicializar RAG
  const initializeRAG = useCallback(async () => {
    try {
      console.log('[useChatbot] Inicializando RAG...');
      setRagStatus('initializing');
      
      // Inicializa o RAG no groqService
      await groqService.initializeRAG();
      
      setRagStatus('ready');
      console.log('[useChatbot] RAG inicializado com sucesso');
      
      toast({
        title: "RAG Inicializado",
        description: "Sistema de busca inteligente está pronto para uso.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('[useChatbot] Erro ao inicializar RAG:', error);
      setRagStatus('error');
      
      toast({
        title: "Erro no RAG",
        description: "Não foi possível inicializar o sistema de busca. Funcionando em modo básico.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Testar conexão inicial
  const testConnection = useCallback(async () => {
    try {
      console.log('[useChatbot] Iniciando teste de conexão...');
      const isConnected = await groqService.testConnection();
      setIsConnected(isConnected);
      
      if (!isConnected) {
        console.warn('[useChatbot] Falha na conexão com Groq');
        setRagStatus('disabled');
        toast({
          title: "Conexão com Groq",
          description: "Não foi possível conectar à API da Groq. Verifique sua chave de API.",
          variant: "destructive"
        });
      } else {
        console.log('[useChatbot] Conexão com Groq estabelecida com sucesso');
        // Inicializa RAG após conexão bem-sucedida
        await initializeRAG();
      }
    } catch (error) {
      console.error('[useChatbot] Erro ao testar conexão:', error);
      setIsConnected(false);
      setRagStatus('error');
    }
  }, [toast, initializeRAG]);

  // Enviar mensagem
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    // Adiciona mensagem do usuário
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      saveMessages(newMessages);
      return newMessages;
    });

    setIsLoading(true);

    // Cria mensagem temporária do bot
    const botMessageId = generateMessageId();
    const tempBotMessage: ChatMessage = {
      id: botMessageId,
      content: '',
      sender: 'bot',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => {
      const newMessages = [...prev, tempBotMessage];
      saveMessages(newMessages);
      return newMessages;
    });

    try {
      console.log('[useChatbot] Enviando mensagem para Groq...');
      
      // Prepara histórico de mensagens para o Groq
      const messageHistory: GroqMessage[] = messages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Adiciona a nova mensagem do usuário
      messageHistory.push({
        role: 'user',
        content: content.trim()
      });

      // Envia para o Groq com RAG
      const response = await groqService.sendMessage(messageHistory);
      
      // Atualiza mensagem do bot com a resposta
      setMessages(prev => {
        const newMessages = prev.map(msg => 
          msg.id === botMessageId 
            ? { 
                ...msg, 
                content: response.content, 
                isLoading: false,
                sources: response.sources 
              }
            : msg
        );
        saveMessages(newMessages);
        return newMessages;
      });

      console.log('[useChatbot] Resposta recebida com sucesso');

    } catch (error) {
      console.error('[useChatbot] Erro ao enviar mensagem:', error);
      
      // Atualiza mensagem do bot com erro
      setMessages(prev => {
        const newMessages = prev.map(msg => 
          msg.id === botMessageId 
            ? { 
                ...msg, 
                content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.', 
                isLoading: false 
              }
            : msg
        );
        saveMessages(newMessages);
        return newMessages;
      });

      toast({
        title: "Erro na Comunicação",
        description: "Não foi possível enviar a mensagem. Verifique sua conexão.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [isLoading, messages, generateMessageId, saveMessages, toast, scrollToBottom]);

  // Ações do chat
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    scrollToBottom();
  }, [scrollToBottom]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[useChatbot] Erro ao limpar localStorage:', error);
    }
    
    toast({
      title: "Conversa Limpa",
      description: "Todas as mensagens foram removidas.",
      variant: "default"
    });
  }, [toast]);

  // Efeito para testar conexão na inicialização
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  // Efeito para scroll automático quando mensagens mudam
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  return {
    // Estado
    messages,
    isOpen,
    isLoading,
    isConnected,
    ragStatus,
    
    // Ações
    sendMessage,
    toggleChat,
    openChat,
    closeChat,
    clearMessages,
    initializeRAG,
    
    // Refs
    messagesEndRef
  };
};

export default useChatbot;