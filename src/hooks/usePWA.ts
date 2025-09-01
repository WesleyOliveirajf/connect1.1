import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isLoading: boolean;
  error: string | null;
}

interface PWAActions {
  install: () => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  clearCache: () => Promise<boolean>;
  registerServiceWorker: () => Promise<boolean>;
}

export const usePWA = (): PWAState & PWAActions => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar se está em modo standalone (instalado)
  const isStandalone = useState(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  })[0];

  // Verificar se pode instalar
  const canInstall = isInstallable && !isInstalled && !isStandalone;

  // Registrar service worker
  const registerServiceWorker = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker não suportado');
      return false;
    }

    // Verificar se o documento está em estado válido
    if (document.readyState === 'loading') {
      console.warn('[PWA] Documento ainda carregando, aguardando...');
      return new Promise((resolve) => {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => resolve(registerServiceWorker()), 100);
        }, { once: true });
      });
    }

    try {
      setIsLoading(true);
      setError(null);

      // Aguardar um frame para garantir que o documento esteja estável
      await new Promise(resolve => requestAnimationFrame(resolve));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registrado:', registration.scope);

      // Verificar atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nova versão disponível');
              // Aqui você pode notificar o usuário sobre a atualização
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[PWA] Erro ao registrar Service Worker:', error);
      
      // Tratamento específico para InvalidStateError
      if (error instanceof Error && error.name === 'InvalidStateError') {
        console.warn('[PWA] Documento em estado inválido, tentando novamente em 1s...');
        setError('Aguardando estado válido do documento...');
        
        // Retry após 1 segundo
        setTimeout(async () => {
          try {
            await registerServiceWorker();
          } catch (retryError) {
            console.error('[PWA] Falha no retry:', retryError);
            setError(`Erro persistente no Service Worker: ${(retryError as Error).message}`);
          }
        }, 1000);
        
        return false;
      }
      
      setError(`Erro no Service Worker: ${(error as Error).message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Instalar PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      setError('Instalação não disponível');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] Usuário aceitou a instalação');
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('[PWA] Usuário rejeitou a instalação');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Erro durante instalação:', error);
      setError('Erro durante a instalação');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [deferredPrompt]);

  // Verificar atualizações
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      setIsLoading(true);
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        await registration.update();
        console.log('[PWA] Verificação de atualização concluída');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Erro ao verificar atualizações:', error);
      setError('Erro ao verificar atualizações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Limpar cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      setIsLoading(true);
      
      // Enviar mensagem para o service worker
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        const messageChannel = new MessageChannel();
        
        return new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              console.log('[PWA] Cache limpo com sucesso');
              resolve(true);
            } else {
              resolve(false);
            }
          };
          
          registration.active!.postMessage(
            { type: 'CLEAR_CACHE' },
            [messageChannel.port2]
          );
        });
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Erro ao limpar cache:', error);
      setError('Erro ao limpar cache');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Só registrar Service Worker em produção ou quando explicitamente solicitado
    // Em desenvolvimento, pode causar conflitos com o HMR do Vite
    const shouldRegisterSW = import.meta.env.PROD || localStorage.getItem('force-sw-registration') === 'true';
    
    if (shouldRegisterSW) {
      // Aguardar o documento estar completamente carregado antes de registrar o service worker
      const initServiceWorker = () => {
        if (document.readyState === 'complete') {
          setTimeout(() => registerServiceWorker(), 1000); // Delay adicional
        } else {
          window.addEventListener('load', () => {
            setTimeout(() => registerServiceWorker(), 1000);
          }, { once: true });
        }
      };
      
      initServiceWorker();
    } else {
      console.log('[PWA] Service Worker desabilitado em desenvolvimento. Use localStorage.setItem("force-sw-registration", "true") para forçar.');
    }

    // Listener para beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt disparado');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listener para appinstalled
    const handleAppInstalled = () => {
      console.log('[PWA] App instalado');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Listeners para status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Adicionar event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar se já está instalado
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [registerServiceWorker, isStandalone]);

  return {
    // Estado
    isInstallable,
    isInstalled,
    isOnline,
    isStandalone,
    canInstall,
    isLoading,
    error,
    // Ações
    install,
    checkForUpdates,
    clearCache,
    registerServiceWorker
  };
};

export default usePWA;