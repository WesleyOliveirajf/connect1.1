/**
 * Sistema de Rate Limiting para prevenir ataques de força bruta
 * Implementa bloqueio progressivo baseado em tentativas falhadas
 */

interface LoginAttempt {
  timestamp: number;
  ip?: string;
  userAgent?: string;
}

interface RateLimitState {
  attempts: LoginAttempt[];
  blockedUntil?: number;
  totalFailures: number;
}

const RATE_LIMIT_KEY = 'torp_rate_limit';
const MAX_ATTEMPTS = 5; // Máximo de tentativas
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos em ms
const ATTEMPT_WINDOW = 10 * 60 * 1000; // Janela de 10 minutos
const PROGRESSIVE_BLOCKS = [
  1 * 60 * 1000,   // 1 minuto após 3 tentativas
  5 * 60 * 1000,   // 5 minutos após 4 tentativas  
  15 * 60 * 1000,  // 15 minutos após 5 tentativas
  60 * 60 * 1000,  // 1 hora após 6+ tentativas
];

export class LoginRateLimiter {
  /**
   * Obtém o fingerprint básico do cliente
   */
  private static getClientFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Torp Security Check', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      canvas.toDataURL(),
      new Date().getTimezoneOffset().toString()
    ].join('|');
    
    // Hash simples para reduzir tamanho
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Carrega estado atual do rate limiting
   */
  private static loadState(): RateLimitState {
    try {
      const stored = localStorage.getItem(RATE_LIMIT_KEY);
      if (stored) {
        const state = JSON.parse(stored) as RateLimitState;
        // Limpar tentativas antigas
        const now = Date.now();
        state.attempts = state.attempts.filter(
          attempt => now - attempt.timestamp < ATTEMPT_WINDOW
        );
        return state;
      }
    } catch (error) {
      console.error('Erro ao carregar estado do rate limiter:', error);
    }
    
    return {
      attempts: [],
      totalFailures: 0
    };
  }

  /**
   * Salva estado do rate limiting
   */
  private static saveState(state: RateLimitState): void {
    try {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Erro ao salvar estado do rate limiter:', error);
    }
  }

  /**
   * Verifica se está bloqueado
   */
  static isBlocked(): { blocked: boolean; remainingTime?: number; reason?: string } {
    const state = this.loadState();
    const now = Date.now();

    // Verifica bloqueio ativo
    if (state.blockedUntil && now < state.blockedUntil) {
      const remainingTime = state.blockedUntil - now;
      return {
        blocked: true,
        remainingTime: Math.ceil(remainingTime / 1000),
        reason: `Muitas tentativas falhadas. Tente novamente em ${Math.ceil(remainingTime / 60000)} minutos.`
      };
    }

    // Verifica tentativas recentes
    const recentAttempts = state.attempts.filter(
      attempt => now - attempt.timestamp < ATTEMPT_WINDOW
    );

    if (recentAttempts.length >= MAX_ATTEMPTS) {
      return {
        blocked: true,
        reason: `Limite de tentativas excedido (${MAX_ATTEMPTS} em 10 minutos). Tente mais tarde.`
      };
    }

    return { blocked: false };
  }

  /**
   * Registra tentativa de login falhada
   */
  static recordFailedAttempt(): void {
    const state = this.loadState();
    const now = Date.now();
    const fingerprint = this.getClientFingerprint();

    const attempt: LoginAttempt = {
      timestamp: now,
      userAgent: navigator.userAgent
    };

    state.attempts.push(attempt);
    state.totalFailures += 1;

    // Calcular duração do bloqueio baseado no número de tentativas
    const recentAttempts = state.attempts.filter(
      att => now - att.timestamp < ATTEMPT_WINDOW
    );

    if (recentAttempts.length >= 3) {
      const blockIndex = Math.min(recentAttempts.length - 3, PROGRESSIVE_BLOCKS.length - 1);
      const blockDuration = PROGRESSIVE_BLOCKS[blockIndex];
      state.blockedUntil = now + blockDuration;

      console.warn('🚨 Rate limit ativado:', {
        tentativas: recentAttempts.length,
        bloqueadoAte: new Date(state.blockedUntil).toLocaleString(),
        duracao: Math.ceil(blockDuration / 60000) + ' minutos',
        fingerprint: fingerprint.substring(0, 8) + '...'
      });
    }

    this.saveState(state);

    // Log de segurança para auditoria
    console.warn('🔐 Tentativa de login falhada registrada:', {
      timestamp: new Date(now).toISOString(),
      totalTentativas: recentAttempts.length,
      totalFalhas: state.totalFailures,
      fingerprint: fingerprint.substring(0, 8) + '...'
    });
  }

  /**
   * Registra login bem-sucedido (limpa rate limiting)
   */
  static recordSuccessfulLogin(): void {
    try {
      localStorage.removeItem(RATE_LIMIT_KEY);
      console.log('✅ Rate limiting resetado após login bem-sucedido');
    } catch (error) {
      console.error('Erro ao resetar rate limiting:', error);
    }
  }

  /**
   * Obtém estatísticas do rate limiting
   */
  static getStats(): {
    recentAttempts: number;
    totalFailures: number;
    isCurrentlyBlocked: boolean;
    nextAttemptAllowedAt?: Date;
  } {
    const state = this.loadState();
    const now = Date.now();
    
    const recentAttempts = state.attempts.filter(
      attempt => now - attempt.timestamp < ATTEMPT_WINDOW
    ).length;

    return {
      recentAttempts,
      totalFailures: state.totalFailures,
      isCurrentlyBlocked: state.blockedUntil ? now < state.blockedUntil : false,
      nextAttemptAllowedAt: state.blockedUntil ? new Date(state.blockedUntil) : undefined
    };
  }

  /**
   * Reseta completamente o rate limiting (usar apenas para debug/admin)
   */
  static reset(): void {
    localStorage.removeItem(RATE_LIMIT_KEY);
    console.log('🔄 Rate limiting resetado completamente');
  }
}

/**
 * Hook para usar rate limiting
 */
export const useRateLimiter = () => {
  const checkBlocked = () => {
    return LoginRateLimiter.isBlocked();
  };

  const recordFailed = () => {
    LoginRateLimiter.recordFailedAttempt();
  };

  const recordSuccess = () => {
    LoginRateLimiter.recordSuccessfulLogin();
  };

  const getStats = () => {
    return LoginRateLimiter.getStats();
  };

  const reset = () => {
    LoginRateLimiter.reset();
  };

  return {
    checkBlocked,
    recordFailed,
    recordSuccess,
    getStats,
    reset
  };
};