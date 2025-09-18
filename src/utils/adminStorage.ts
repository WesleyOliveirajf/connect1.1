// Utilitários para gerenciamento de dados administrativos
// Garante persistência dos comunicados e configurações de admin com criptografia
import { 
  setEncryptedStorage, 
  getEncryptedStorage, 
  removeEncryptedStorage,
  hasEncryptedStorage 
} from './encryption';
import { InputSanitizer } from './sanitizer';

const STORAGE_KEYS = {
  ANNOUNCEMENTS: 'torp_announcements',
  ADMIN_SESSION: 'torp_admin_session',
  BACKUP_DATA: 'torp_backup_data'
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: 'alta' | 'média' | 'baixa';
  date: string;
  createdAt?: string;
  updatedAt?: string;
};

// Dados padrão da empresa - Lista limpa conforme solicitado
const DEFAULT_ANNOUNCEMENTS: Announcement[] = [];

// Classe para gerenciar o armazenamento administrativo
export class AdminStorage {
  // Salvar comunicados com backup automático (criptografado e sanitizado)
  static saveAnnouncements(announcements: Announcement[]): boolean {
    try {
      // Sanitizar e adicionar timestamps de atualização
      const sanitizedAnnouncements = announcements.map(ann => {
        // Sanitizar campos de texto
        const sanitized = InputSanitizer.sanitizeObject(ann, {
          title: 'text',
          content: 'richText',
          priority: 'text',
          date: 'text'
        });

        // Detectar possíveis tentativas de XSS
        const xssCheck = InputSanitizer.detectXSS(ann.content);
        if (xssCheck.isXSS) {
          console.warn('🚨 Tentativa de XSS detectada em comunicado:', {
            id: ann.id,
            patterns: xssCheck.patterns
          });
        }

        return {
          ...sanitized,
          updatedAt: new Date().toISOString()
        };
      });

      // Salvar dados principais com criptografia
      setEncryptedStorage(STORAGE_KEYS.ANNOUNCEMENTS, sanitizedAnnouncements);
      
      // Criar backup automático criptografado
      const backupData = {
        announcements: sanitizedAnnouncements,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      setEncryptedStorage(STORAGE_KEYS.BACKUP_DATA, backupData);
      
      console.log('✅ Comunicados sanitizados e salvos com criptografia');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar comunicados:', error);
      return false;
    }
  }

  // Carregar comunicados com fallback para dados padrão (descriptografado)
  static loadAnnouncements(): Announcement[] {
    try {
      const stored = getEncryptedStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS);
      
      if (stored && Array.isArray(stored)) {
        console.log('📂 Comunicados carregados e descriptografados');
        return stored;
      } else {
        // Primeira vez ou dados corrompidos - salvar dados padrão
        console.log('🆕 Primeira execução ou dados corrompidos - carregando dados padrão');
        this.saveAnnouncements(DEFAULT_ANNOUNCEMENTS);
        return DEFAULT_ANNOUNCEMENTS;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar comunicados:', error);
      console.log('🔄 Limpando dados corrompidos e usando dados padrão como fallback');
      // Limpa dados corrompidos e reinicia com dados padrão
      this.clearAllData();
      this.saveAnnouncements(DEFAULT_ANNOUNCEMENTS);
      return DEFAULT_ANNOUNCEMENTS;
    }
  }

  // Restaurar backup (descriptografado)
  static restoreFromBackup(): Announcement[] | null {
    try {
      const backupData = getEncryptedStorage<{announcements: Announcement[], timestamp: string, version: string}>(STORAGE_KEYS.BACKUP_DATA);
      if (backupData && backupData.announcements) {
        console.log('🔄 Backup descriptografado e restaurado com sucesso');
        return backupData.announcements;
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      return null;
    }
  }

  // Resetar para dados padrão
  static resetToDefault(): Announcement[] {
    console.log('🔄 Resetando para dados padrão');
    this.saveAnnouncements(DEFAULT_ANNOUNCEMENTS);
    return DEFAULT_ANNOUNCEMENTS;
  }

  // Exportar dados para backup manual
  static exportData(): string {
    const announcements = this.loadAnnouncements();
    const exportData = {
      announcements,
      exportDate: new Date().toISOString(),
      version: '1.0',
      source: 'Torp Huddle Space'
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Importar dados de backup manual
  static importData(jsonData: string): boolean {
    try {
      const importedData = JSON.parse(jsonData);
      if (importedData.announcements && Array.isArray(importedData.announcements)) {
        this.saveAnnouncements(importedData.announcements);
        console.log('📥 Dados importados com sucesso');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao importar dados:', error);
      return false;
    }
  }

  // Verificar integridade dos dados
  static validateData(): boolean {
    try {
      const announcements = this.loadAnnouncements();
      return announcements.every(ann => 
        ann.id && ann.title && ann.content && ann.priority && ann.date
      );
    } catch {
      return false;
    }
  }

  // Limpar todos os dados criptografados (usar com cuidado)
  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      removeEncryptedStorage(key);
    });
    console.log('🗑️ Todos os dados administrativos criptografados foram limpos');
  }
}

// Hook para usar o sistema de armazenamento
export const useAdminStorage = () => {
  const saveAnnouncements = (announcements: Announcement[]) => {
    return AdminStorage.saveAnnouncements(announcements);
  };

  const loadAnnouncements = () => {
    return AdminStorage.loadAnnouncements();
  };

  const resetToDefault = () => {
    return AdminStorage.resetToDefault();
  };

  const exportData = () => {
    return AdminStorage.exportData();
  };

  const importData = (jsonData: string) => {
    return AdminStorage.importData(jsonData);
  };

  return {
    saveAnnouncements,
    loadAnnouncements,
    resetToDefault,
    exportData,
    importData,
    validateData: AdminStorage.validateData,
    restoreFromBackup: AdminStorage.restoreFromBackup
  };
};