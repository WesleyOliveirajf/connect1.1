import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatbot } from '@/hooks/useChatbot';
import { cn } from '@/lib/utils';

interface ChatbotProps {
  className?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ className }) => {
  const {
    messages,
    isOpen,
    isLoading,
    isConnected,
    sendMessage,
    toggleChat,
    closeChat,
    clearMessages,
    messagesEndRef
  } = useChatbot();

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focar no input quando abrir o chat
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputValue.trim() || isLoading) return;
      const message = inputValue.trim();
      setInputValue('');
      sendMessage(message);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {/* Botão Flutuante */}
      {!isOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleChat}
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <MessageCircle className="h-6 w-6" />
                {!isConnected && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Abrir Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Interface do Chat */}
      {isOpen && (
        <Card className="w-80 sm:w-96 h-[500px] shadow-2xl border-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Header */}
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <CardTitle className="text-lg font-semibold">Oráculo</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {/* Status de Conexão */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        {isConnected ? (
                          <Wifi className="h-4 w-4 text-green-200" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-200" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isConnected ? 'Conectado' : 'Desconectado'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Limpar Chat */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearMessages}
                        className="h-8 w-8 p-0 hover:bg-white/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Limpar Histórico</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Fechar */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeChat}
                  className="h-8 w-8 p-0 hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Área de Mensagens */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="h-[360px] overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-muted text-muted-foreground',
                      message.isLoading && 'animate-pulse'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={cn(
                        'text-xs mt-1 opacity-70',
                        message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground/70'
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          {/* Input de Mensagem */}
          <div className="p-4 border-t bg-muted/30">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim() || isLoading}
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            
            {/* Status */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {isLoading && (
                  <Badge variant="secondary" className="animate-pulse">
                    Processando...
                  </Badge>
                )}
                {!isConnected && (
                  <Badge variant="destructive">
                    Desconectado
                  </Badge>
                )}
              </div>
              <span>{messages.length} mensagens</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Chatbot;