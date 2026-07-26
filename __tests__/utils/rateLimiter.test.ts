import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '../../src/utils/rateLimiter';

describe('Rate Limiter Utility', () => {
  beforeEach(() => {
    resetRateLimit('test_login');
  });

  it('deve permitir tentativas iniciais sem bloqueio', () => {
    const status = checkRateLimit('test_login', 3, 30);
    expect(status.isBlocked).toBe(false);
    expect(status.remainingSeconds).toBe(0);
  });

  it('deve bloquear após atingir o número máximo de tentativas falhas', () => {
    recordFailedAttempt('test_login', 3, 30);
    recordFailedAttempt('test_login', 3, 30);
    const status = recordFailedAttempt('test_login', 3, 30);

    expect(status.isBlocked).toBe(true);
    expect(status.remainingSeconds).toBe(30);
  });

  it('deve liberar o acesso após resetar o contador', () => {
    recordFailedAttempt('test_login', 1, 30);
    resetRateLimit('test_login');

    const status = checkRateLimit('test_login', 1, 30);
    expect(status.isBlocked).toBe(false);
  });
});
