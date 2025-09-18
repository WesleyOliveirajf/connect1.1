import { useState, useEffect } from 'react';
import { AnnouncementService, setupRealtime } from '@/services/supabaseService';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'alta' | 'média' | 'baixa';
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar comunicados do Supabase
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setIsLoading(true);
        const data = await AnnouncementService.getAnnouncements();
        setAnnouncements(data);
        console.log(`[useAnnouncements] ✅ Carregados ${data.length} comunicados`);
      } catch (error) {
        console.error('[useAnnouncements] ❌ Erro ao carregar comunicados:', error);
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();

    // Configurar realtime para sincronização
    setupRealtime();

    // Escutar eventos de atualização
    const handleAnnouncementsUpdate = () => {
      loadAnnouncements();
    };

    window.addEventListener('announcements_updated', handleAnnouncementsUpdate);
    
    return () => {
      window.removeEventListener('announcements_updated', handleAnnouncementsUpdate);
    };
  }, []);

  // Adicionar comunicado
  const addAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'date' | 'createdAt' | 'updatedAt'>) => {
    const success = await AnnouncementService.addAnnouncement(announcementData);
    if (success) {
      // Recarregar dados após adição
      const data = await AnnouncementService.getAnnouncements();
      setAnnouncements(data);
    }
    return success;
  };

  // Atualizar comunicado
  const updateAnnouncement = async (id: string, announcementData: Partial<Omit<Announcement, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => {
    const success = await AnnouncementService.updateAnnouncement(id, announcementData);
    if (success) {
      // Recarregar dados após atualização
      const data = await AnnouncementService.getAnnouncements();
      setAnnouncements(data);
    }
    return success;
  };

  // Remover comunicado
  const deleteAnnouncement = async (id: string) => {
    const success = await AnnouncementService.deleteAnnouncement(id);
    if (success) {
      // Recarregar dados após remoção
      const data = await AnnouncementService.getAnnouncements();
      setAnnouncements(data);
    }
    return success;
  };

  // Exportar dados
  const exportData = () => {
    try {
      return JSON.stringify(announcements, null, 2);
    } catch (error) {
      console.error('❌ Erro ao exportar dados:', error);
      return null;
    }
  };

  // Importar dados (implementação simplificada para compatibilidade)
  const importData = (jsonData: string) => {
    try {
      const importedAnnouncements = JSON.parse(jsonData);
      
      // Validar estrutura dos dados
      if (!Array.isArray(importedAnnouncements)) {
        throw new Error('Dados devem ser um array');
      }

      // TODO: Implementar importação em lote no Supabase
      console.warn('⚠️ Importação de comunicados temporariamente desabilitada');
      return false;
    } catch (error) {
      console.error('❌ Erro ao importar dados:', error);
      return false;
    }
  };

  return {
    announcements,
    isLoading,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    exportData,
    importData,
  };
};

// Tipo já exportado na interface acima