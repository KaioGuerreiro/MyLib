/**
 * Rate Limiter simples para proteger tentativas de Login e Cadastro no lado do cliente.
 */

interface RateLimitState {
  attempts: number;
  blockedUntil: number | null;
}

const attemptStore: Record<string, RateLimitState> = {};

/**
 * Verifica se a ação (ex: 'login' ou 'register') está bloqueada por excesso de tentativas.
 * @returns { isBlocked: boolean; remainingSeconds: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  cooldownSeconds: number = 60
): { isBlocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const state = attemptStore[key];

  if (!state) {
    return { isBlocked: false, remainingSeconds: 0 };
  }

  if (state.blockedUntil && now < state.blockedUntil) {
    const remainingSeconds = Math.ceil((state.blockedUntil - now) / 1000);
    return { isBlocked: true, remainingSeconds };
  }

  // Se o tempo de bloqueio já expirou, reseta o estado
  if (state.blockedUntil && now >= state.blockedUntil) {
    attemptStore[key] = { attempts: 0, blockedUntil: null };
    return { isBlocked: false, remainingSeconds: 0 };
  }

  return { isBlocked: false, remainingSeconds: 0 };
}

/**
 * Registra uma tentativa falha e ativa o bloqueio se exceder o limite máximo.
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts: number = 5,
  cooldownSeconds: number = 60
): { isBlocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const state = attemptStore[key] || { attempts: 0, blockedUntil: null };

  state.attempts += 1;

  if (state.attempts >= maxAttempts) {
    state.blockedUntil = now + cooldownSeconds * 1000;
    attemptStore[key] = state;
    return { isBlocked: true, remainingSeconds: cooldownSeconds };
  }

  attemptStore[key] = state;
  return { isBlocked: false, remainingSeconds: 0 };
}

/**
 * Reseta o contador de tentativas (usado quando o login/cadastro é bem-sucedido).
 */
export function resetRateLimit(key: string): void {
  delete attemptStore[key];
}
