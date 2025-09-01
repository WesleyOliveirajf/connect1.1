import { useState, useEffect } from 'react';
import { AdminStorage, type Announcement, useAdminStorage } from '../utils/adminStorage';

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const adminStorage = useAdminStorage();

  // Carregar comunicados usando o sistema de armazenamento administrativo
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setIsLoading(true);
        
        // Verificar integridade dos dados primeiro
        const isValid = adminStorage.validateData();
        
        if (!isValid) {
          console.warn('⚠️ Dados corrompidos detectados, restaurando backup...');
          const backup = adminStorage.restoreFromBackup();
          if (backup) {
            setAnnouncements(backup);
            adminStorage.saveAnnouncements(backup);
          } else {
            console.log('🔄 Backup não disponível, usando dados padrão');
            const defaultData = adminStorage.resetToDefault();
            setAnnouncements(defaultData);
          }
        } else {
          // Carregar dados normalmente
          const loadedAnnouncements = adminStorage.loadAnnouncements();
          setAnnouncements(loadedAnnouncements);
        }
      } catch (error) {
        console.error('❌ Erro crítico ao carregar comunicados:', error);
        // Fallback para dados padrão em caso de erro crítico
        const defaultData = adminStorage.resetToDefault();
        setAnnouncements(defaultData);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  // Atualizar comunicados com validação e backup automático
  const updateAnnouncements = (newAnnouncements: Announcement[]) => {
    try {
      // Validar dados antes de salvar
      const isValid = newAnnouncements.every(ann => 
        ann.id && ann.title && ann.content && ann.priority && ann.date
      );

      if (!isValid) {
        console.error('❌ Dados inválidos detectados, operação cancelada');
        return false;
      }

      // Atualizar estado local
      setAnnouncements(newAnnouncements);
      
      // Salvar com backup automático
      const success = adminStorage.saveAnnouncements(newAnnouncements);
      
      if (success) {
        console.log('✅ Comunicados atualizados com sucesso');
        return true;
      } else {
        console.error('❌ Falha ao salvar comunicados');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar comunicados:', error);
      return false;
    }
  };

  // Resetar para dados padrão com confirmação
  const resetAnnouncements = () => {
    try {
      const defaultData = adminStorage.resetToDefault();
      setAnnouncements(defaultData);
      console.log('🔄 Comunicados resetados para padrão');
      return true;
    } catch (error) {
      console.error('❌ Erro ao resetar comunicados:', error);
      return false;
    }
  };

  // Exportar dados para backup manual
  const exportData = () => {
    try {
      return adminStorage.exportData();
    } catch (error) {
      console.error('❌ Erro ao exportar dados:', error);
      return null;
    }
  };

  // Importar dados de backup manual
  const importData = (jsonData: string) => {
    try {
      const success = adminStorage.importData(jsonData);
      if (success) {
        // Recarregar dados após importação
        const importedAnnouncements = adminStorage.loadAnnouncements();
        setAnnouncements(importedAnnouncements);
        console.log('📥 Dados importados e aplicados com sucesso');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao importar dados:', error);
      return false;
    }
  };

  // Restaurar do backup automático
  const restoreFromBackup = () => {
    try {
      const backup = adminStorage.restoreFromBackup();
      if (backup) {
        setAnnouncements(backup);
        adminStorage.saveAnnouncements(backup);
        console.log('🔄 Backup restaurado com sucesso');
        return true;
      } else {
        console.warn('⚠️ Nenhum backup disponível');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      return false;
    }
  };

  return {
    announcements,
    isLoading,
    updateAnnouncements,
    resetAnnouncements,
    exportData,
    importData,
    restoreFromBackup,
    validateData: adminStorage.validateData
  };
};

// Exportar tipo para uso em outros componentes
export type { Announcement };