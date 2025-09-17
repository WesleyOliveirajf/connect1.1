import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Users, 
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Activity
} from 'lucide-react';
import { Announcement } from '@/hooks/useAnnouncements';
import { useSecureSession } from '@/utils/sessionStorage';
import { useRateLimiter } from '@/utils/rateLimiter';
import EmployeeManager from './EmployeeManager';
import AnnouncementManagerSimple from './AnnouncementManagerSimple';
import ServiceStatus from './ServiceStatus';

interface AdminPanelProps {
  announcements: Announcement[];
  onAnnouncementsChange: (announcements: Announcement[]) => void;
  exportData?: () => string | null;
  importData?: (jsonData: string) => boolean;
  restoreFromBackup?: () => boolean;
  resetAnnouncements?: () => boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  announcements,
  onAnnouncementsChange,
  exportData,
  importData,
  restoreFromBackup,
  resetAnnouncements
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('announcements');
  const [remainingTime, setRemainingTime] = useState(0);
  
  const { toast } = useToast();
  const { isAuthenticated, login, logout, getRemainingTime } = useSecureSession();
  const { checkBlocked, recordFailed, recordSuccess } = useRateLimiter();

  // Senha administrativa obtida do ambiente (padrão para desenvolvimento)
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'TorpAdmin2025!@#';

  const handleLogin = () => {
    // Verificar rate limiting antes de tentar login
    const rateLimitCheck = checkBlocked();
    if (rateLimitCheck.blocked) {
      toast({
        title: "🚨 Acesso Temporariamente Bloqueado",
        description: rateLimitCheck.reason || "Muitas tentativas falhadas. Tente mais tarde.",
        variant: "destructive",
      });
      setPassword('');
      return;
    }

    if (password === ADMIN_PASSWORD) {
      recordSuccess(); // Limpa rate limiting
      login();
      setIsLoginOpen(false);
      setIsAdminPanelOpen(true);
      setPassword('');
      updateRemainingTime();
      toast({
        title: "🔓 Acesso Administrativo Concedido",
        description: "Bem-vindo ao painel de administração da Torp.",
      });
    } else {
      recordFailed(); // Registra tentativa falhada
      toast({
        title: "🚫 Acesso Negado",
        description: "Senha administrativa incorreta.",
        variant: "destructive",
      });
      setPassword('');
      // Log de tentativa de acesso inválida (para auditoria)
      console.warn('🚨 Tentativa de acesso administrativo com senha inválida', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    }
  };

  const handleLogout = () => {
    logout();
    setIsAdminPanelOpen(false);
    setActiveTab('announcements');
    setRemainingTime(0);
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado do painel administrativo.",
    });
  };

  // Atualiza o tempo restante da sessão
  const updateRemainingTime = () => {
    setRemainingTime(getRemainingTime());
  };

  // Verifica periodicamente a validade da sessão
  useEffect(() => {
    const checkSession = () => {
      if (isAuthenticated()) {
        updateRemainingTime();
      } else if (isAdminPanelOpen) {
        // Sessão expirada - fazer logout automático
        handleLogout();
        toast({
          title: "⏰ Sessão Expirada",
          description: "Sua sessão administrativa expirou por inatividade.",
          variant: "destructive",
        });
      }
    };

    const interval = setInterval(checkSession, 60000); // Verifica a cada minuto
    checkSession(); // Verifica imediatamente

    return () => clearInterval(interval);
  }, [isAdminPanelOpen, isAuthenticated, updateRemainingTime, handleLogout, toast]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // Renderizar botão de acesso
  const renderAccessButton = () => {
    if (!isAuthenticated()) {
      return (
        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 px-2 py-1 text-xs">
              <Shield className="h-3 w-3" />
              Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" aria-describedby="login-description">
            <div id="login-description" className="sr-only">
              Formulário de login para acesso administrativo
            </div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" style={{ color: 'hsl(var(--announcement-accent))' }} />
                Acesso Administrativo
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="admin-password" className="text-sm font-medium">
                  Senha Administrativa
                </label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite a senha administrativa"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogin} className="flex-1 gap-1 px-2 py-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Entrar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 px-2 py-1 text-xs"
                  onClick={() => {
                    setIsLoginOpen(false);
                    setPassword('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Dialog open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 px-2 py-1 text-xs">
              <Settings className="h-3 w-3" />
              Painel Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden" aria-describedby="admin-panel-description">
            <div id="admin-panel-description" className="sr-only">
              Painel de administração com gerenciamento de comunicados e funcionários
            </div>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" style={{ color: 'hsl(var(--announcement-accent))' }} />
                  Painel de Administração - Torp
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Sessão: {remainingTime}min
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="announcements" className="gap-2">
                  <Megaphone className="h-4 w-4" />
                  Comunicados
                </TabsTrigger>
                <TabsTrigger value="employees" className="gap-2">
                  <Users className="h-4 w-4" />
                  Funcionários
                </TabsTrigger>
                <TabsTrigger value="status" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Status
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-4 max-h-[70vh] overflow-y-auto">
                <TabsContent value="announcements" className="space-y-4">
                  <AnnouncementManagerSimple
                    announcements={announcements}
                    onAnnouncementsChange={onAnnouncementsChange}
                    exportData={exportData}
                    importData={importData}
                    restoreFromBackup={restoreFromBackup}
                    resetAnnouncements={resetAnnouncements}
                  />
                </TabsContent>
                
                <TabsContent value="employees" className="space-y-4">
                  <EmployeeManager />
                </TabsContent>
                
                <TabsContent value="status" className="space-y-4">
                  <ServiceStatus />
                </TabsContent>
              </div>
            </Tabs>
            
            {/* Botão de Logout */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                Sair do Painel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return renderAccessButton();
};

export default AdminPanel;