import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { Download, X, Smartphone, Monitor, Wifi, WifiOff } from 'lucide-react';

interface InstallPromptProps {
  className?: string;
  variant?: 'banner' | 'button' | 'card';
  showOnlineStatus?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  className = '',
  variant = 'banner',
  showOnlineStatus = true,
  autoHide = false,
  autoHideDelay = 10000
}) => {
  const {
    canInstall,
    isInstalled,
    isOnline,
    isStandalone,
    isLoading,
    error,
    install
  } = usePWA();
  
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Auto-hide após delay
  React.useEffect(() => {
    if (autoHide && canInstall && !isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, canInstall, isDismissed]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (success) {
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('Erro durante instalação:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Não mostrar se não pode instalar, já foi dispensado, já está instalado ou em modo standalone
  if (!canInstall || isDismissed || isInstalled || isStandalone) {
    return null;
  }

  // Componente de status online/offline
  const OnlineStatus = () => {
    if (!showOnlineStatus) return null;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${
        isOnline ? 'text-green-600' : 'text-red-600'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        )}
      </div>
    );
  };

  // Variante Banner
  if (variant === 'banner') {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg transform transition-transform duration-300 ${className}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                <Monitor className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  Instale o TORP Huddle Space
                </p>
                <p className="text-xs text-blue-100">
                  Acesse rapidamente e use offline
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <OnlineStatus />
              
              <button
                onClick={handleInstall}
                disabled={isInstalling || isLoading}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label="Instalar aplicativo"
              >
                {isInstalling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Instalando...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Instalar</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleDismiss}
                className="text-blue-100 hover:text-white transition-colors p-1"
                aria-label="Fechar prompt de instalação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-2 text-xs text-red-200 bg-red-500/20 px-3 py-1 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Variante Button
  if (variant === 'button') {
    return (
      <button
        onClick={handleInstall}
        disabled={isInstalling || isLoading}
        className={`inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label="Instalar aplicativo"
      >
        {isInstalling ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Instalando...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Instalar App</span>
          </>
        )}
      </button>
    );
  }

  // Variante Card
  if (variant === 'card') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 ${className}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 text-sm">
                Instalar TORP Huddle Space
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Acesse rapidamente e funcione offline
              </p>
              <div className="flex items-center gap-4 mt-2">
                <OnlineStatus />
                {error && (
                  <span className="text-xs text-red-600">{error}</span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Fechar prompt de instalação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleInstall}
            disabled={isInstalling || isLoading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-label="Instalar aplicativo"
          >
            {isInstalling ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Instalando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Instalar</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
          >
            Agora não
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default InstallPrompt;