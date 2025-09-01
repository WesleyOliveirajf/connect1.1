import CryptoJS from 'crypto-js';

// Gera uma chave baseada no domínio e salt do ambiente
const getEncryptionKey = (): string => {
  const domain = window.location.hostname;
  const salt = import.meta.env.VITE_ENCRYPTION_SALT || 'TORP_SECURE_DEFAULT_2025';
  
  // Aviso se estiver usando salt padrão
  if (salt === 'TORP_SECURE_DEFAULT_2025') {
    console.warn('⚠️ Usando salt padrão para criptografia. Configure VITE_ENCRYPTION_SALT em produção!');
  }
  
  return CryptoJS.SHA256(domain + salt).toString();
};

/**
 * Criptografa dados para armazenamento seguro
 */
export const encryptData = <T>(data: T): string => {
  try {
    const key = getEncryptionKey();
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Erro ao criptografar dados:', error);
    throw new Error('Falha na criptografia dos dados');
  }
};

/**
 * Descriptografa dados do armazenamento
 */
export const decryptData = <T>(encryptedData: string): T | null => {
  try {
    const key = getEncryptionKey();
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      console.warn('Falha ao descriptografar dados - dados corrompidos ou chave inválida');
      return null;
    }
    
    return JSON.parse(decryptedString) as T;
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    return null;
  }
};

/**
 * Armazena dados criptografados no localStorage
 */
export const setEncryptedStorage = <T>(key: string, data: T): void => {
  try {
    const encrypted = encryptData(data);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('Erro ao armazenar dados criptografados:', error);
    throw error;
  }
};

/**
 * Recupera e descriptografa dados do localStorage
 */
export const getEncryptedStorage = <T>(key: string): T | null => {
  try {
    const encryptedData = localStorage.getItem(key);
    if (!encryptedData) {
      return null;
    }
    
    const result = decryptData<T>(encryptedData);
    
    // Se falhou ao descriptografar, limpa o item corrompido
    if (result === null && encryptedData) {
      console.warn(`Removendo dados corrompidos para a chave: ${key}`);
      localStorage.removeItem(key);
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao recuperar dados criptografados:', error);
    // Remove dados corrompidos em caso de erro
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Limpa todos os dados criptografados do localStorage
 * Útil quando há mudança de salt ou problemas de descriptografia
 */
export const clearEncryptedStorage = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    // Identifica chaves que provavelmente contêm dados criptografados
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('torp_') || key.includes('admin_') || key.includes('encrypted_'))) {
        keysToRemove.push(key);
      }
    }
    
    // Remove as chaves identificadas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removido: ${key}`);
    });
    
    console.log(`Limpeza concluída: ${keysToRemove.length} itens removidos`);
  } catch (error) {
    console.error('Erro ao limpar localStorage:', error);
  }
};

/**
 * Remove dados criptografados do localStorage
 */
export const removeEncryptedStorage = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * Verifica se há dados criptografados para uma chave específica
 */
export const hasEncryptedStorage = (key: string): boolean => {
  return localStorage.getItem(key) !== null;
};