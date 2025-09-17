import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import groqService from '@/utils/groqService';
import type { ServiceStatus } from '@/utils/groqService';

interface ServiceStatusProps {
  className?: string;
}

const ServiceStatusComponent: React.FC<ServiceStatusProps> = ({ className }) => {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkStatus = async () => {
    setIsRefreshing(true);
    try {
      const serviceStatus = groqService.getServiceStatus();
      setStatus(serviceStatus);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Erro ao verificar status do serviço:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Verificar status a cada 30 segundos
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (!status) return <AlertCircle className="h-4 w-4 text-gray-500" />;
    
    if (status.isConfigured && status.hasApiKey && !status.lastError) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status.lastError) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    if (!status) return 'Verificando...';
    
    if (status.isConfigured && status.hasApiKey && !status.lastError) {
      return 'Operacional';
    } else if (status.lastError) {
      return 'Com problemas';
    } else {
      return 'Configuração incompleta';
    }
  };

  const getStatusColor = () => {
    if (!status) return 'secondary';
    
    if (status.isConfigured && status.hasApiKey && !status.lastError) {
      return 'default'; // Verde
    } else if (status.lastError) {
      return 'destructive'; // Vermelho
    } else {
      return 'secondary'; // Amarelo
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Status do Serviço Groq
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkStatus}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {status && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Modelo:</span>
              <span className="text-sm font-mono">{status.currentModel}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">API Key:</span>
              <Badge variant={status.hasApiKey ? 'default' : 'destructive'}>
                {status.hasApiKey ? 'Configurada' : 'Não configurada'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">RAG:</span>
              <Badge variant={status.ragEnabled ? 'default' : 'secondary'}>
                {status.ragEnabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {status.lastSuccessfulConnection && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última conexão:</span>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  {formatDate(status.lastSuccessfulConnection)}
                </div>
              </div>
            )}

            {status.lastError && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Último erro:
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {status.lastError}
                </p>
              </div>
            )}

            {lastCheck && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Última verificação: {formatDate(lastCheck)}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceStatusComponent;